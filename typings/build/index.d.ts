declare const enum Build {
  MinCVer = 89, // minimum Chrome version
  MinFFVer = 78, // minimum Firefox version
  BTypes = 3, // supported browser types: BrowserType.Chrome | BrowserType.Firefox
  Minify = 0,
  NDEBUG = 0,
  NoDialogUI = 1,
  NativeWordMoveOnFirefox = 1,
  MayOverrideNewTab = 0,
  MayAndroidOnFirefox = 1,
  DetectAPIOnFirefox = 1,
}
// Note: one random value must be used only in one .ts file, to avoid issues caused by partly building
declare const enum BuildStr {
  Commit = "dev",
  /** used by {@link ../../content/extend_click.ts} */
  RandomClick = 1000,
  /** used by {@link ../../content/frontend.ts} */
  RandomReq = 2019070,
  CoreGetterFuncName = "__VimiumC_priv__",
  FirefoxID = "vimium-c@gdh1995.cn",
}
