{ pkgs }: {
    deps = [
      pkgs.gh,
      pkgs.yarn,
      pkgs.esbuild,
      pkgs.nodejs-22_x,
      pkgs.nodePackages.typescript,
      pkgs.nodePackages.typescript-language-server
    ];
}