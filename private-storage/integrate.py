from pathlib import Path
import shutil
import sys
import os
import re

source = Path(__file__).resolve().parent
app = Path(sys.argv[1])
if len(sys.argv) > 2 and sys.argv[2] == 'android':
    java = app / 'android/app/src/main/java/com/datacore/erp'
    activity = java / 'MainActivity.java'
    text = activity.read_text()
    # Register the local plugin before Capacitor builds its bridge.
    if 'OwnerDrivePlugin.class' not in text:
        text = text.replace('import com.getcapacitor.BridgeActivity;', 'import com.getcapacitor.BridgeActivity;\nimport android.os.Bundle;')
        anchor = 'public class MainActivity extends BridgeActivity {'
        assert anchor in text, 'Unexpected Android activity'
        text = text.replace(anchor, anchor + '''
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OwnerDrivePlugin.class);
        super.onCreate(savedInstanceState);
    }
''', 1)
        activity.write_text(text)
    shutil.copyfile(source/'OwnerDrivePlugin.java', java/'OwnerDrivePlugin.java')
    gradle = app/'android/app/build.gradle'
    text = gradle.read_text()
    if 'play-services-auth' not in text:
        assert 'dependencies {' in text
        text = text.replace('dependencies {', "dependencies {\n    implementation 'com.google.android.gms:play-services-auth:21.5.0'",1)
        gradle.write_text(text)
    # Keep the existing app ID and signing key, and increment the release version
    # so Android can install this APK as an update with its existing app data.
    version = 1000 + int(os.environ.get('GITHUB_RUN_NUMBER', '112'))
    text = re.sub(r'\bversionCode\s+\d+', f'versionCode {version}', text, count=1)
    text = re.sub(r'\bversionName\s+"[^"]*"', 'versionName "Trial V1 Private Storage"', text, count=1)
    gradle.write_text(text)
else:
    dest = app/'src/privateStorage'
    dest.mkdir(parents=True,exist_ok=True)
    for name in ['drive.ts','PrivateStorageScreen.tsx']:
        shutil.copyfile(source/name, dest/name)
    path = app/'src/App.tsx'
    text = path.read_text()
    if 'PrivateStorageScreen' not in text:
        text = "import { PrivateStorageScreen } from './privateStorage/PrivateStorageScreen';\n" + text
        anchor = "    ...(isOwner() ? [{ name: 'Trial Manager', icon: ShieldCheck }] : []),"
        assert anchor in text, 'Missing owner navigation anchor'
        text = text.replace(anchor, anchor + "\n    ...(isOwner() ? [{ name: 'My Private Storage', icon: Boxes }] : []),",1)
        anchor = "          {activeModule === 'Trial Manager' && isOwner() && <TrialManager />}"
        assert anchor in text, 'Missing owner content anchor'
        text = text.replace(anchor, anchor + "\n          {activeModule === 'My Private Storage' && isOwner() && <PrivateStorageScreen />}",1)
        path.write_text(text)
print('Integrated owner private storage', sys.argv[2:] or ['web source'])
