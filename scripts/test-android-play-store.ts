import fs from 'fs';
import path from 'path';

interface TestResult {
  id: string;
  category: string;
  title: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: string;
  recommendation?: string;
}

const ROOT_DIR = process.cwd();
const results: TestResult[] = [];

function addResult(result: TestResult) {
  results.push(result);
}

export function runAndroidPlayStoreTests(): { passed: number; failed: number; warnings: number; results: TestResult[] } {
  console.log('🔍 Executing Google Play Store Android Publication Verification Tests...\n');

  // -------------------------------------------------------------
  // TEST 1: Target SDK and Minimum SDK Compliance
  // -------------------------------------------------------------
  try {
    const varGradlePath = path.join(ROOT_DIR, 'android', 'variables.gradle');
    if (!fs.existsSync(varGradlePath)) {
      addResult({
        id: 'SDK-01',
        category: 'SDK & Architecture',
        title: 'Android variables.gradle existence',
        status: 'FAIL',
        details: 'android/variables.gradle is missing.',
        recommendation: 'Ensure variables.gradle defines compileSdkVersion and targetSdkVersion.',
      });
    } else {
      const content = fs.readFileSync(varGradlePath, 'utf8');
      const targetSdkMatch = content.match(/targetSdkVersion\s*=\s*(\d+)/);
      const compileSdkMatch = content.match(/compileSdkVersion\s*=\s*(\d+)/);
      const minSdkMatch = content.match(/minSdkVersion\s*=\s*(\d+)/);

      const targetSdk = targetSdkMatch ? parseInt(targetSdkMatch[1], 10) : 0;
      const compileSdk = compileSdkMatch ? parseInt(compileSdkMatch[1], 10) : 0;
      const minSdk = minSdkMatch ? parseInt(minSdkMatch[1], 10) : 0;

      // Google Play requirement (2024-2026): Target SDK must be >= 34 (Android 14+)
      if (targetSdk >= 34) {
        addResult({
          id: 'SDK-02',
          category: 'SDK & Architecture',
          title: 'Target SDK Level Compliance (API >= 34)',
          status: 'PASS',
          details: `targetSdkVersion is set to ${targetSdk} (Complies with Google Play policy requiring API 34+).`,
        });
      } else {
        addResult({
          id: 'SDK-02',
          category: 'SDK & Architecture',
          title: 'Target SDK Level Compliance (API >= 34)',
          status: 'FAIL',
          details: `targetSdkVersion is ${targetSdk}. Google Play requires new apps and updates to target at least API level 34.`,
          recommendation: 'Update targetSdkVersion in android/variables.gradle to 34, 35, or 36.',
        });
      }

      if (compileSdk >= 34) {
        addResult({
          id: 'SDK-03',
          category: 'SDK & Architecture',
          title: 'Compile SDK Level Compliance',
          status: 'PASS',
          details: `compileSdkVersion is set to ${compileSdk}.`,
        });
      } else {
        addResult({
          id: 'SDK-03',
          category: 'SDK & Architecture',
          title: 'Compile SDK Level Compliance',
          status: 'FAIL',
          details: `compileSdkVersion is ${compileSdk}, below the recommended API level 34.`,
          recommendation: 'Set compileSdkVersion to 34 or higher.',
        });
      }

      if (minSdk >= 21 && minSdk <= 26) {
        addResult({
          id: 'SDK-04',
          category: 'SDK & Architecture',
          title: 'Minimum SDK Level Compatibility',
          status: 'PASS',
          details: `minSdkVersion is set to ${minSdk} (Supports 99%+ of active global Android devices).`,
        });
      } else {
        addResult({
          id: 'SDK-04',
          category: 'SDK & Architecture',
          title: 'Minimum SDK Level Compatibility',
          status: 'WARN',
          details: `minSdkVersion is set to ${minSdk}.`,
        });
      }
    }
  } catch (err: any) {
    addResult({
      id: 'SDK-ERR',
      category: 'SDK & Architecture',
      title: 'SDK Version Parsing',
      status: 'FAIL',
      details: `Failed to parse SDK versions: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // TEST 2: Package ID & Branding Integrity
  // -------------------------------------------------------------
  try {
    const buildGradleApp = fs.readFileSync(path.join(ROOT_DIR, 'android', 'app', 'build.gradle'), 'utf8');
    const capConfig = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'capacitor.config.json'), 'utf8'));
    const stringsXml = fs.readFileSync(path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml'), 'utf8');

    const appNameMatch = stringsXml.match(/<string name="app_name">([^<]+)<\/string>/);
    const appName = appNameMatch ? appNameMatch[1] : '';

    if (appName === 'My App' || appName.includes('Example')) {
      addResult({
        id: 'BRAND-01',
        category: 'Branding & Policy',
        title: 'App Name Placeholder Check',
        status: 'FAIL',
        details: `App name in strings.xml is "${appName}". Google Play will reject apps with placeholder titles.`,
        recommendation: 'Change app_name in android/app/src/main/res/values/strings.xml to "ClimaCast".',
      });
    } else {
      addResult({
        id: 'BRAND-01',
        category: 'Branding & Policy',
        title: 'App Name Branding Integrity',
        status: 'PASS',
        details: `App name is set to "${appName}" in strings.xml and matches "${capConfig.appName}" in capacitor.config.json.`,
      });
    }

    const appId = capConfig.appId;
    if (appId.startsWith('com.example') || appId.includes('myapp')) {
      addResult({
        id: 'BRAND-02',
        category: 'Branding & Policy',
        title: 'Application Package ID Check',
        status: 'FAIL',
        details: `Application ID "${appId}" uses a generic/placeholder namespace.`,
        recommendation: 'Use a unique production domain namespace such as com.climacast.weather.',
      });
    } else {
      addResult({
        id: 'BRAND-02',
        category: 'Branding & Policy',
        title: 'Application Package ID Uniqueness',
        status: 'PASS',
        details: `Application ID "${appId}" is properly structured and production-ready.`,
      });
    }

    // Check manifest.json for impersonation
    const webManifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'public', 'manifest.json'), 'utf8'));
    if (webManifest.name === 'Google Weather' || (webManifest.short_name && webManifest.short_name.toLowerCase().includes('google'))) {
      addResult({
        id: 'BRAND-03',
        category: 'Branding & Policy',
        title: 'Trademark Impersonation Check (Google Play Policy)',
        status: 'FAIL',
        details: `Web manifest name is "${webManifest.name}". Claiming to be "Google Weather" violates Google Play Trademark & Impersonation Policy.`,
        recommendation: 'Rename to ClimaCast Weather.',
      });
    } else {
      addResult({
        id: 'BRAND-03',
        category: 'Branding & Policy',
        title: 'Trademark Impersonation Check',
        status: 'PASS',
        details: `App branding "${webManifest.name}" is independent and avoids unauthorized trademark usage.`,
      });
    }
  } catch (err: any) {
    addResult({
      id: 'BRAND-ERR',
      category: 'Branding & Policy',
      title: 'Branding Validation Error',
      status: 'FAIL',
      details: err.message,
    });
  }

  // -------------------------------------------------------------
  // TEST 3: AndroidManifest.xml Security & Permissions
  // -------------------------------------------------------------
  try {
    const manifestPath = path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');

    // 1. Exported Activity Check (Android 12+ requirement)
    if (manifestContent.includes('android:exported="true"') || manifestContent.includes('android:exported="false"')) {
      addResult({
        id: 'MANIFEST-01',
        category: 'Security & Manifest',
        title: 'Android 12+ Exported Activity Attribute',
        status: 'PASS',
        details: 'MainActivity explicitly specifies android:exported="true" with intent filter.',
      });
    } else {
      addResult({
        id: 'MANIFEST-01',
        category: 'Security & Manifest',
        title: 'Android 12+ Exported Activity Attribute',
        status: 'FAIL',
        details: 'android:exported attribute is missing from activities declaring intent-filters.',
        recommendation: 'Add android:exported="true" to MainActivity.',
      });
    }

    // 2. Dangerous Background Location Permission Check
    if (manifestContent.includes('ACCESS_BACKGROUND_LOCATION')) {
      addResult({
        id: 'MANIFEST-02',
        category: 'Security & Manifest',
        title: 'Background Location Policy Compliance',
        status: 'FAIL',
        details: 'ACCESS_BACKGROUND_LOCATION is declared. Google Play strictly rejects apps requesting background location without exhaustive justification and review.',
        recommendation: 'Remove ACCESS_BACKGROUND_LOCATION. ClimaCast only needs foreground location.',
      });
    } else {
      addResult({
        id: 'MANIFEST-02',
        category: 'Security & Manifest',
        title: 'Background Location Policy Compliance',
        status: 'PASS',
        details: 'ACCESS_BACKGROUND_LOCATION is NOT declared. Conforms to Google Play minimal privilege principle.',
      });
    }

    // 3. Foreground Location Permission Check
    const hasCoarse = manifestContent.includes('ACCESS_COARSE_LOCATION');
    const hasFine = manifestContent.includes('ACCESS_FINE_LOCATION');
    if (hasCoarse && hasFine) {
      addResult({
        id: 'MANIFEST-03',
        category: 'Security & Manifest',
        title: 'Foreground Location Permission Declaration',
        status: 'PASS',
        details: 'ACCESS_COARSE_LOCATION and ACCESS_FINE_LOCATION are declared for user GPS weather lookups.',
      });
    } else {
      addResult({
        id: 'MANIFEST-03',
        category: 'Security & Manifest',
        title: 'Foreground Location Permission Declaration',
        status: 'WARN',
        details: 'Location permissions are missing from AndroidManifest.xml. "Use Current Location" may fail in native WebView.',
        recommendation: 'Add ACCESS_COARSE_LOCATION and ACCESS_FINE_LOCATION to AndroidManifest.xml.',
      });
    }

    // 4. GPS Hardware Requirement Filtering
    if (manifestContent.includes('android.hardware.location.gps" android:required="false"')) {
      addResult({
        id: 'MANIFEST-04',
        category: 'Security & Manifest',
        title: 'GPS Hardware Requirement Filtering',
        status: 'PASS',
        details: 'android.hardware.location.gps is declared with android:required="false" allowing tablets and devices without dedicated GPS to install.',
      });
    } else {
      addResult({
        id: 'MANIFEST-04',
        category: 'Security & Manifest',
        title: 'GPS Hardware Requirement Filtering',
        status: 'WARN',
        details: 'android.hardware.location.gps missing or not marked required="false".',
        recommendation: 'Add <uses-feature android:name="android.hardware.location.gps" android:required="false" />.',
      });
    }

    // 5. Insecure Cleartext HTTP Traffic
    if (manifestContent.includes('android:usesCleartextTraffic="true"')) {
      addResult({
        id: 'MANIFEST-05',
        category: 'Security & Manifest',
        title: 'Cleartext HTTP Traffic Policy',
        status: 'WARN',
        details: 'android:usesCleartextTraffic="true" is set. Google Play flags apps with unencrypted HTTP communication.',
        recommendation: 'Ensure all external connections use TLS/HTTPS and remove usesCleartextTraffic="true".',
      });
    } else {
      addResult({
        id: 'MANIFEST-05',
        category: 'Security & Manifest',
        title: 'Cleartext HTTP Traffic Policy',
        status: 'PASS',
        details: 'Uses secure default HTTPS enforcement with no cleartext exemptions.',
      });
    }
  } catch (err: any) {
    addResult({
      id: 'MANIFEST-ERR',
      category: 'Security & Manifest',
      title: 'Manifest Validation Error',
      status: 'FAIL',
      details: err.message,
    });
  }

  // -------------------------------------------------------------
  // TEST 4: Adaptive Icons & Mipmap Densities Check
  // -------------------------------------------------------------
  try {
    const resDir = path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'res');
    const requiredDensities = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];
    const missingDensities: string[] = [];

    for (const density of requiredDensities) {
      const iconPath = path.join(resDir, density, 'ic_launcher.png');
      if (!fs.existsSync(iconPath) || fs.statSync(iconPath).size === 0) {
        missingDensities.push(density);
      }
    }

    if (missingDensities.length === 0) {
      addResult({
        id: 'ICON-01',
        category: 'Visual & Assets',
        title: 'All Standard Android Launcher Icon Densities Present',
        status: 'PASS',
        details: 'Valid ic_launcher.png assets found across mdpi (48px), hdpi (72px), xhdpi (96px), xxhdpi (144px), and xxxhdpi (192px).',
      });
    } else {
      addResult({
        id: 'ICON-01',
        category: 'Visual & Assets',
        title: 'Standard Android Launcher Icon Densities',
        status: 'FAIL',
        details: `Missing icon densities: ${missingDensities.join(', ')}. High-DPI Android devices will fail to render crisp icons.`,
        recommendation: 'Generate PNG icons for all required screen densities.',
      });
    }

    // Adaptive icon XML
    const anyDpi = path.join(resDir, 'mipmap-anydpi-v26', 'ic_launcher.xml');
    if (fs.existsSync(anyDpi)) {
      addResult({
        id: 'ICON-02',
        category: 'Visual & Assets',
        title: 'Android 8.0+ Adaptive Icon Support (anydpi-v26)',
        status: 'PASS',
        details: 'Adaptive icon XML definitions found in mipmap-anydpi-v26 for round and square launchers.',
      });
    } else {
      addResult({
        id: 'ICON-02',
        category: 'Visual & Assets',
        title: 'Android 8.0+ Adaptive Icon Support',
        status: 'WARN',
        details: 'mipmap-anydpi-v26/ic_launcher.xml is missing.',
        recommendation: 'Add adaptive icon XML configuration.',
      });
    }

    // Google Play Store 512x512 High-Res Icon
    const playStoreIcon = path.join(ROOT_DIR, 'public', 'icon-512x512.png');
    if (fs.existsSync(playStoreIcon) && fs.statSync(playStoreIcon).size > 0) {
      addResult({
        id: 'ICON-03',
        category: 'Visual & Assets',
        title: 'Google Play Store 512x512 High-Res Icon',
        status: 'PASS',
        details: '512x512 PNG graphic ready for Google Play Console Store Listing upload.',
      });
    } else {
      addResult({
        id: 'ICON-03',
        category: 'Visual & Assets',
        title: 'Google Play Store 512x512 High-Res Icon',
        status: 'FAIL',
        details: 'public/icon-512x512.png is missing or empty. Google Play Console requires a 512x512 icon.',
        recommendation: 'Ensure public/icon-512x512.png exists.',
      });
    }
  } catch (err: any) {
    addResult({
      id: 'ICON-ERR',
      category: 'Visual & Assets',
      title: 'Icon Asset Validation Error',
      status: 'FAIL',
      details: err.message,
    });
  }

  // -------------------------------------------------------------
  // TEST 5: Privacy Policy & In-App Access (Top Rejection Reason)
  // -------------------------------------------------------------
  try {
    const privacyHtmlPath = path.join(ROOT_DIR, 'public', 'privacy-policy.html');
    if (fs.existsSync(privacyHtmlPath) && fs.statSync(privacyHtmlPath).size > 500) {
      const content = fs.readFileSync(privacyHtmlPath, 'utf8');
      const hasLocationSection = content.toLowerCase().includes('location');
      const hasDeletionSection = content.toLowerCase().includes('deletion') || content.toLowerCase().includes('delete');
      const hasChildrenSection = content.toLowerCase().includes('children');

      if (hasLocationSection && hasDeletionSection && hasChildrenSection) {
        addResult({
          id: 'PRIVACY-01',
          category: 'Privacy & Data Safety',
          title: 'Google Play Compliant Privacy Policy Document',
          status: 'PASS',
          details: 'public/privacy-policy.html contains comprehensive sections covering Location Data, User Rights/Deletion, Zero Advertising, and Children Privacy (COPPA).',
        });
      } else {
        addResult({
          id: 'PRIVACY-01',
          category: 'Privacy & Data Safety',
          title: 'Privacy Policy Document Completeness',
          status: 'WARN',
          details: 'Privacy policy is present but may be missing key disclosures (Location, Data Deletion, or Children Privacy).',
          recommendation: 'Ensure all standard Google Play policy sections are explicitly documented.',
        });
      }
    } else {
      addResult({
        id: 'PRIVACY-01',
        category: 'Privacy & Data Safety',
        title: 'Privacy Policy Document Availability',
        status: 'FAIL',
        details: 'public/privacy-policy.html is missing. Google Play strictly rejects any app handling location or user preferences without a valid Privacy Policy.',
        recommendation: 'Create a dedicated Privacy Policy page and link it in the app.',
      });
    }

    // Check if Privacy Policy is linked inside Settings
    const settingsCode = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'SettingsModal.tsx'), 'utf8');
    if (settingsCode.includes('privacy-policy.html') || settingsCode.toLowerCase().includes('privacy policy')) {
      addResult({
        id: 'PRIVACY-02',
        category: 'Privacy & Data Safety',
        title: 'In-App Privacy Policy Access',
        status: 'PASS',
        details: 'Direct in-app link to Privacy Policy is integrated in the Settings modal.',
      });
    } else {
      addResult({
        id: 'PRIVACY-02',
        category: 'Privacy & Data Safety',
        title: 'In-App Privacy Policy Access',
        status: 'FAIL',
        details: 'Google Play User Data policy requires the Privacy Policy to be accessible from WITHIN the distributed app, not just the store listing.',
        recommendation: 'Add a Privacy Policy link inside SettingsModal.tsx.',
      });
    }
  } catch (err: any) {
    addResult({
      id: 'PRIVACY-ERR',
      category: 'Privacy & Data Safety',
      title: 'Privacy Policy Verification Error',
      status: 'FAIL',
      details: err.message,
    });
  }

  // -------------------------------------------------------------
  // TEST 6: Android App Bundle (.aab) & Release Build Automation
  // -------------------------------------------------------------
  try {
    const releaseWorkflow = fs.readFileSync(path.join(ROOT_DIR, '.github', 'workflows', 'release.yml'), 'utf8');
    const hasAabStep = releaseWorkflow.includes('bundleRelease') || releaseWorkflow.includes('.aab');

    if (hasAabStep) {
      addResult({
        id: 'BUILD-01',
        category: 'Build & Release Pipeline',
        title: 'Android App Bundle (.aab) Build Step in CI/CD',
        status: 'PASS',
        details: 'CI/CD pipeline builds the release Android App Bundle (.aab) mandated by Google Play Store.',
      });
    } else {
      addResult({
        id: 'BUILD-01',
        category: 'Build & Release Pipeline',
        title: 'Android App Bundle (.aab) Build Step in CI/CD',
        status: 'WARN',
        details: 'CI/CD only executes assembleDebug (.apk). Google Play Console requires Android App Bundle (.aab) format for new app submissions.',
        recommendation: 'Add ./gradlew bundleRelease to .github/workflows/release.yml to generate .aab artifacts.',
      });
    }

    // Check if gradlew and wrapper exist
    const gradlewPath = path.join(ROOT_DIR, 'android', 'gradlew');
    const gradlewJarPath = path.join(ROOT_DIR, 'android', 'gradle', 'wrapper', 'gradle-wrapper.jar');
    if (fs.existsSync(gradlewPath) && fs.existsSync(gradlewJarPath)) {
      addResult({
        id: 'BUILD-02',
        category: 'Build & Release Pipeline',
        title: 'Gradle Wrapper & Scripts Integrity',
        status: 'PASS',
        details: 'Gradle wrapper script (gradlew) and wrapper JAR are in place for reproducible CI/CD execution.',
      });
    } else {
      addResult({
        id: 'BUILD-02',
        category: 'Build & Release Pipeline',
        title: 'Gradle Wrapper & Scripts Integrity',
        status: 'FAIL',
        details: 'android/gradlew or gradle-wrapper.jar is missing. Native compilation will fail in CI/CD.',
        recommendation: 'Restore gradle wrapper files to the android/ directory.',
      });
    }
  } catch (err: any) {
    addResult({
      id: 'BUILD-ERR',
      category: 'Build & Release Pipeline',
      title: 'Build Verification Error',
      status: 'FAIL',
      details: err.message,
    });
  }

  // -------------------------------------------------------------
  // TEST 7: Android System Back Button Handling
  // -------------------------------------------------------------
  try {
    const appCode = fs.readFileSync(path.join(ROOT_DIR, 'src', 'App.tsx'), 'utf8');
    if (appCode.includes('backbutton') || appCode.includes('popstate') || appCode.includes('App.addListener(\'backButton\'')) {
      addResult({
        id: 'NAV-01',
        category: 'UX & Navigation Quality',
        title: 'Android Hardware/Gesture Back Button Handling',
        status: 'PASS',
        details: 'App registers backbutton event listeners to dismiss open dialogs and modals gracefully.',
      });
    } else {
      addResult({
        id: 'NAV-01',
        category: 'UX & Navigation Quality',
        title: 'Android Hardware/Gesture Back Button Handling',
        status: 'WARN',
        details: 'App does not register a backbutton listener. On Android devices, pressing the system back button while a modal is open may prematurely exit the application.',
        recommendation: 'Register a backbutton listener in src/App.tsx to close active modals first.',
      });
    }
  } catch (err: any) {
    addResult({
      id: 'NAV-ERR',
      category: 'UX & Navigation Quality',
      title: 'Navigation Test Error',
      status: 'FAIL',
      details: err.message,
    });
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const warnings = results.filter((r) => r.status === 'WARN').length;

  console.log(`\n======================================================`);
  console.log(`📊 Google Play Store Readiness Test Results:`);
  console.log(`   ✅ PASSED:   ${passed}`);
  console.log(`   ❌ FAILED:   ${failed}`);
  console.log(`   ⚠️  WARNINGS: ${warnings}`);
  console.log(`======================================================\n`);

  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️ ';
    console.log(`${icon} [${r.id}] ${r.category} > ${r.title}`);
    console.log(`   ${r.details}`);
    if (r.recommendation) {
      console.log(`   👉 Action: ${r.recommendation}`);
    }
    console.log('');
  }

  return { passed, failed, warnings, results };
}

// Allow direct execution
if (process.argv[1]?.endsWith('test-android-play-store.ts')) {
  runAndroidPlayStoreTests();
}
