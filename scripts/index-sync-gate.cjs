'use strict';
const SHA = /^[0-9a-f]{40}$/;
const REPO = 'opensiro/vsm-harness-index';

function decide({trigger, notifiedSha = '', notifiedRepo = '', sourceSha, publishedSha = ''}) {
  if (!SHA.test(sourceSha)) throw new Error('Canonical Index checkout is not pinned to a full SHA');
  if (trigger === 'repository_dispatch') {
    if (notifiedRepo !== REPO || !SHA.test(notifiedSha)) {
      throw new Error('Invalid Index change notification');
    }
  }
  return {skip: trigger === 'repository_dispatch' && sourceSha === publishedSha,
    sourceSha, outdatedNotification: trigger === 'repository_dispatch' && notifiedSha !== sourceSha};
}

function verifyLatest(sourceSha, currentMainSha) {
  if (!SHA.test(sourceSha) || !SHA.test(currentMainSha)) throw new Error('Invalid Index main SHA');
  return sourceSha === currentMainSha;
}

if (require.main === module) {
  const args = Object.fromEntries(process.argv.slice(3).reduce((acc, s, i, all) => {
    if (s.startsWith('--')) acc.push([s.slice(2), all[i + 1] || '']);
    return acc;
  }, []));
  if (process.argv[2] === 'preflight') {
    const result = decide({trigger:args.trigger,notifiedSha:args['notified-sha'],
      notifiedRepo:args['notified-repo'],sourceSha:args['source-sha'],publishedSha:args['published-sha']});
    process.stdout.write('skip=' + result.skip + '\n');
    console.error('Canonical Index: ' + result.sourceSha + (result.outdatedNotification ? ' (newer than notification)' : ''));
  } else if (process.argv[2] === 'before-publish') {
    if (!verifyLatest(args['source-sha'], args['latest-sha'])) {
      console.error('Outdated Index snapshot; do not commit or deploy');
      process.exitCode = 1;
    }
  } else {
    throw new Error('Usage: node scripts/index-sync-gate.cjs preflight|before-publish --...');
  }
}
module.exports = {decide, verifyLatest};
