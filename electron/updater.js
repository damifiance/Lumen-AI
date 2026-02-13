const { dialog, shell, app } = require('electron');
const https = require('https');

const REPO_OWNER = 'damifiance';
const REPO_NAME = 'Lumen-AI';

function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
      headers: { 'User-Agent': 'Lumen-AI-Updater' },
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`GitHub API returned ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function compareVersions(current, latest) {
  const parse = (v) => v.replace(/^v/, '').split('.').map(Number);
  const c = parse(current);
  const l = parse(latest);
  for (let i = 0; i < 3; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return 1;
    if ((l[i] || 0) < (c[i] || 0)) return -1;
  }
  return 0;
}

async function checkForUpdates(options = {}) {
  const { silent = false, parentWindow = null } = options;
  const currentVersion = app.getVersion();

  try {
    const release = await fetchLatestRelease();
    const latestVersion = release.tag_name.replace(/^v/, '');

    if (compareVersions(currentVersion, latestVersion) > 0) {
      const { response } = await dialog.showMessageBox(parentWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version of Lumen AI is available!`,
        detail: `Current version: v${currentVersion}\nLatest version: v${latestVersion}\n\nWould you like to download it?`,
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1,
      });

      if (response === 0) {
        shell.openExternal(release.html_url);
      }

      return { updateAvailable: true, latestVersion, currentVersion };
    } else {
      if (!silent) {
        dialog.showMessageBox(parentWindow, {
          type: 'info',
          title: 'No Updates',
          message: 'You\'re up to date!',
          detail: `Lumen AI v${currentVersion} is the latest version.`,
          buttons: ['OK'],
        });
      }
      return { updateAvailable: false, latestVersion, currentVersion };
    }
  } catch (err) {
    console.error('Update check failed:', err.message);
    if (!silent) {
      dialog.showMessageBox(parentWindow, {
        type: 'error',
        title: 'Update Check Failed',
        message: 'Could not check for updates',
        detail: 'Please check your internet connection and try again.',
        buttons: ['OK'],
      });
    }
    return { updateAvailable: false, error: err.message };
  }
}

module.exports = { checkForUpdates, compareVersions };
