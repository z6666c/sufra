// تعديلات بعد إنشاء مشاريع آيفون وأندرويد: الإصدار، آيفون فقط، إعفاء التشفير، وصف الصلاحيات، اللغة العربية
// الاستخدام: node scripts/native.mjs ios|android [version] [build]
import fs from "node:fs";
const [platform, version = "1.0.0", build = "1"] = process.argv.slice(2);
const edit = (p, fn) => { if (!fs.existsSync(p)) { console.log("skip (missing):", p); return; } fs.writeFileSync(p, fn(fs.readFileSync(p, "utf8"))); console.log("patched:", p); };
if (platform === "ios") {
  edit("ios/App/App/Info.plist", (s) => {
    const add = (k, v) => (s.includes(`<key>${k}</key>`) ? s : s.replace(/<dict>/, `<dict>\n\t<key>${k}</key>\n\t${v}`));
    s = add("ITSAppUsesNonExemptEncryption", "<false/>");
    s = add("NSPhotoLibraryAddUsageDescription", "<string>لحفظ صور تصاميمك في ألبوم الصور.</string>");
    s = add("CFBundleLocalizations", "<array><string>ar</string><string>en</string></array>");
    s = s.replace(/(<key>CFBundleDevelopmentRegion<\/key>\s*<string>)[^<]*(<\/string>)/, "$1ar$2");
    return s;
  });
  edit("ios/App/App.xcodeproj/project.pbxproj", (s) => s
    .replace(/TARGETED_DEVICE_FAMILY = "1,2";/g, "TARGETED_DEVICE_FAMILY = 1;")
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`));
}
if (platform === "android") {
  edit("android/app/build.gradle", (s) => s
    .replace(/versionCode \d+/, `versionCode ${build}`)
    .replace(/versionName "[^"]*"/, `versionName "${version}"`));
  edit("android/variables.gradle", (s) => s.replace(/targetSdkVersion = \d+/, (m) => (Number(m.split("=")[1]) < 36 ? "targetSdkVersion = 36" : m)).replace(/compileSdkVersion = \d+/, (m) => (Number(m.split("=")[1]) < 36 ? "compileSdkVersion = 36" : m)));
}
