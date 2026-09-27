#!/usr/bin/env bash
set -euo pipefail

readonly REPOSITORY="zettel-lint/zettel-lint"
apply_changes=false
prune_legacy_labels=false

usage() {
	printf '%s\n' \
		'Usage: normalize-issue-labels.sh [--apply] [--prune]' \
		'Preview normalization by default. --apply writes after interactive confirmation.' \
		'--prune also migrates notes/update to zl-notes and removes unused legacy labels.'
}

fail() {
	printf 'Error: %s\n' "$*" >&2
	exit 1
}

while (($#)); do
	case "$1" in
		--apply) apply_changes=true ;;
		--prune) prune_legacy_labels=true ;;
		-h|--help) usage; exit 0 ;;
		*) fail "Unknown option: $1 (use --help for usage)" ;;
	esac
	shift
done

command -v gh >/dev/null 2>&1 || fail 'GitHub CLI (gh) is required'
command -v jq >/dev/null 2>&1 || fail 'jq is required'
gh auth status --hostname github.com >/dev/null
repository_name=$(gh repo view "$REPOSITORY" --json nameWithOwner --jq '.nameWithOwner')
[[ "$repository_name" == "$REPOSITORY" ]] || fail "Could not verify repository $REPOSITORY"

declare -a label_names=(
	bug documentation duplicate enhancement 'good first issue' 'help wanted'
	hacktoberfest-accepted invalid question wontfix required-before-contributions
	dependencies github-actions javascript version-bump automated-pr
	zl-core zl-export zl-fix zl-import zl-index zl-linter zl-notes zl-todo
)
declare -a label_colors=(
	d73a4a 0075ca cfd3d7 a2eeef 7057ff 008672
	757fd1 e4e669 d876e3 ffffff c618ad
	0366d6 000000 168700 bbb28f 3e5961
	6e7781 6e7781 6e7781 6e7781 6e7781 6e7781 6e7781 6e7781
)
declare -a label_descriptions=(
	"Something isn't working"
	"Improvements or additions to documentation"
	"This issue or pull request already exists"
	"New feature or request"
	"Good for newcomers"
	"Extra attention is needed"
	"Accepted contribution for Hacktoberfest"
	"This doesn't seem right"
	"Further information is requested"
	"This will not be worked on"
	"Action required before contributing"
	"Pull requests that update a dependency file"
	"Pull requests that update GitHub Actions code"
	"Pull requests that update JavaScript code"
	"Automated pull requests that update the package patch version"
	"Pull requests created by repository automation"
	"Shared CLI and core behavior"
	"Export functionality"
	"File-fixing rules and operations"
	"Import functionality"
	"Index and reference generation"
	"Markdown linting functionality"
	"Note management functionality"
	"Task and TODO management functionality"
)

if ((${#label_names[@]} != ${#label_colors[@]} || ${#label_names[@]} != ${#label_descriptions[@]})); then
	fail 'Internal error: label metadata arrays have different lengths'
fi

load_labels() {
	gh label list --repo "$REPOSITORY" --limit 1000 --json name,color,description
}

has_label() {
	jq -e --arg label_name "$2" 'any(.[]; .name == $label_name)' <<<"$1" >/dev/null
}

label_field() {
	jq -r --arg label_name "$2" --arg field "$3" '.[] | select(.name == $label_name) | .[$field] // ""' <<<"$1"
}

load_associations() {
	local label_name=$1
	local issue_json pull_json
	issue_json=$(gh issue list --repo "$REPOSITORY" --state all --label "$label_name" --limit 1000 --json number,title)
	pull_json=$(gh pr list --repo "$REPOSITORY" --state all --label "$label_name" --limit 1000 --json number,title)
	mapfile -t issue_numbers < <(jq -r '.[].number' <<<"$issue_json")
	mapfile -t pull_numbers < <(jq -r '.[].number' <<<"$pull_json")
	issue_rows=$(jq -r '.[] | "#\(.number) \(.title)"' <<<"$issue_json")
	pull_rows=$(jq -r '.[] | "#\(.number) \(.title)"' <<<"$pull_json")
}

labels_json=$(load_labels)
if has_label "$labels_json" github_actions; then
	has_label "$labels_json" github-actions && fail 'Both github_actions and github-actions exist; resolve the rename conflict manually'
fi

declare -a action_types=()
declare -a action_names=()
declare -a action_colors=()
declare -a action_descriptions=()
if has_label "$labels_json" github_actions; then
	action_types+=(rename)
	action_names+=(github_actions)
	action_colors+=(000000)
	action_descriptions+=("Pull requests that update GitHub Actions code")
fi

for index in "${!label_names[@]}"; do
	label_name=${label_names[$index]}
	desired_color=${label_colors[$index]}
	desired_description=${label_descriptions[$index]}
	current_color=''
	current_description=''
	if has_label "$labels_json" "$label_name"; then
		current_color=$(label_field "$labels_json" "$label_name" color)
		current_description=$(label_field "$labels_json" "$label_name" description)
		current_color=${current_color,,}
	fi
	if [[ "$label_name" == github-actions ]] && has_label "$labels_json" github_actions; then
		continue
	fi
	if [[ "$current_color" != "$desired_color" || "$current_description" != "$desired_description" ]]; then
		if has_label "$labels_json" "$label_name"; then
			action_types+=(edit)
		else
			action_types+=(create)
		fi
		action_names+=("$label_name")
		action_colors+=("$desired_color")
		action_descriptions+=("$desired_description")
	fi
done

declare -a migration_sources=()
declare -a migration_kinds=()
declare -a migration_numbers=()
declare -A migration_seen=()
declare -a deletion_candidates=()
if [[ "$prune_legacy_labels" == true ]]; then
	has_label "$labels_json" zl-notes || fail 'Cannot migrate legacy labels: zl-notes does not exist'
	for legacy_label in notes update no-issue-activity; do
		if ! has_label "$labels_json" "$legacy_label"; then
			continue
		fi
		load_associations "$legacy_label"
		printf 'Associations for %q:\n' "$legacy_label"
		[[ -z "$issue_rows" ]] || printf '  Issues: %s\n' "$issue_rows"
		[[ -z "$pull_rows" ]] || printf '  Pull requests: %s\n' "$pull_rows"
		if [[ "$legacy_label" == notes || "$legacy_label" == update ]]; then
			for issue_number in "${issue_numbers[@]}"; do
				migration_key="$legacy_label:issue:$issue_number"
				if [[ -z "${migration_seen[$migration_key]+present}" ]]; then
					migration_sources+=("$legacy_label")
					migration_kinds+=(issue)
					migration_numbers+=("$issue_number")
					migration_seen[$migration_key]=true
				fi
			done
			for pull_number in "${pull_numbers[@]}"; do
				migration_key="$legacy_label:pull:$pull_number"
				if [[ -z "${migration_seen[$migration_key]+present}" ]]; then
					migration_sources+=("$legacy_label")
					migration_kinds+=(pull)
					migration_numbers+=("$pull_number")
					migration_seen[$migration_key]=true
				fi
			done
			deletion_candidates+=("$legacy_label")
		elif ((${#issue_numbers[@]} == 0 && ${#pull_numbers[@]} == 0)); then
			deletion_candidates+=("$legacy_label")
		else
			printf 'Will keep %q because associations remain.\n' "$legacy_label"
		fi
	done
fi

printf 'Planned label changes for %s:\n' "$REPOSITORY"
for index in "${!action_types[@]}"; do
	case "${action_types[$index]}" in
		rename) printf '  Rename %q to github-actions and normalize its metadata.\n' "${action_names[$index]}" ;;
		edit) printf '  Update %q (color %s, description: %s).\n' "${action_names[$index]}" "${action_colors[$index]}" "${action_descriptions[$index]}" ;;
		create) printf '  Create %q (color %s, description: %s).\n' "${action_names[$index]}" "${action_colors[$index]}" "${action_descriptions[$index]}" ;;
	esac
done
for index in "${!migration_numbers[@]}"; do
	printf '  Migrate %q to zl-notes on %s #%s.\n' "${migration_sources[$index]}" "${migration_kinds[$index]}" "${migration_numbers[$index]}"
done
for label_name in "${deletion_candidates[@]}"; do
	printf '  Remove legacy label %q after verifying no associations remain.\n' "$label_name"
done
if [[ "$prune_legacy_labels" != true ]]; then
	printf 'Legacy-label changes are excluded; use --prune to preview migration and pruning.\n'
fi
if [[ "$apply_changes" != true ]]; then
	printf 'Dry run only; no GitHub changes made. Use --apply to confirm the listed changes.\n'
	exit 0
fi

[[ -t 0 ]] || fail '--apply requires an interactive terminal'
printf 'Type APPLY to perform the listed changes: '
read -r confirmation
[[ "$confirmation" == APPLY ]] || fail 'Confirmation did not match; no changes made'

for index in "${!action_types[@]}"; do
	label_name=${action_names[$index]}
	label_color=${action_colors[$index]}
	label_description=${action_descriptions[$index]}
	case "${action_types[$index]}" in
		rename) gh label edit "$label_name" --repo "$REPOSITORY" --name github-actions --color "$label_color" --description "$label_description" ;;
		edit) gh label edit "$label_name" --repo "$REPOSITORY" --color "$label_color" --description "$label_description" ;;
		create) gh label create "$label_name" --repo "$REPOSITORY" --color "$label_color" --description "$label_description" ;;
	esac
done

for index in "${!migration_numbers[@]}"; do
	if [[ "${migration_kinds[$index]}" == issue ]]; then
		gh issue edit "${migration_numbers[$index]}" --repo "$REPOSITORY" \
			--add-label zl-notes --remove-label "${migration_sources[$index]}"
	else
		gh pr edit "${migration_numbers[$index]}" --repo "$REPOSITORY" \
			--add-label zl-notes --remove-label "${migration_sources[$index]}"
	fi
done

for label_name in "${deletion_candidates[@]}"; do
	load_associations "$label_name"
	if ((${#issue_numbers[@]} != 0 || ${#pull_numbers[@]} != 0)); then
		printf 'Keeping %q because associations remain after migration.\n' "$label_name" >&2
		continue
	fi
	gh label delete "$label_name" --repo "$REPOSITORY" --yes
done

final_labels=$(load_labels)
for index in "${!label_names[@]}"; do
	label_name=${label_names[$index]}
	has_label "$final_labels" "$label_name" || fail "Verification failed: missing label $label_name"
	final_color=$(label_field "$final_labels" "$label_name" color | tr '[:upper:]' '[:lower:]')
	[[ "$final_color" == "${label_colors[$index]}" ]] || fail "Verification failed: unexpected color for $label_name"
	[[ "$(label_field "$final_labels" "$label_name" description)" == "${label_descriptions[$index]}" ]] || fail "Verification failed: unexpected description for $label_name"
done

if [[ "$prune_legacy_labels" == true ]]; then
	for label_name in notes update no-issue-activity; do
		if has_label "$final_labels" "$label_name"; then
			printf 'Legacy label %q remains; review its associations manually.\n' "$label_name" >&2
		fi
	done
fi
printf 'Label normalization applied and verified.\n'
