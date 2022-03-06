declare const enum Build {
  MinCVer = 89, // minimum Chrome version
  MinFFVer = 78, // minimum Firefox version
  BTypes = 3, // supported browser types: BrowserType.Chrome | BrowserType.Firefox
  OS = 7, // mac = 1 << 0, linux = 1 << 1, win = 1 << 2
  MV3 = 0,
  OnBrowserNativePages = 1,
  NDEBUG = 0,
  Mangle = 0,
  Inline = 0,
  NativeWordMoveOnFirefox = 1,
  MayAndroidOnFirefox = 1,
  DetectAPIOnFirefox = 1,
}
// Note: one random value must be used only in one .ts file, to avoid issues caused by partly building
declare const enum BuildStr {
  Commit = "dev",
  /** used by {@link ../../content/extend_click.ts} */
  RandomClick = 2021831,
  /** used by {@link ../../content/frontend.ts} */
  RandomReq = 2019070,
  CoreGetterFuncName = "__VimiumC_priv__",
  FirefoxID = "vimium-c@gdh1995.cn",
}
