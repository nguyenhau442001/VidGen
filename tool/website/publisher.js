const $ = (id) => document.getElementById(id);
const state = { mode: 'live', connected: false, creator: null, videoId: '', duration: 0, polling: null };
const privacyLabels = {
  PUBLIC_TO_EVERYONE: 'Everyone', MUTUAL_FOLLOW_FRIENDS: 'Friends',
  FOLLOWER_OF_CREATOR: 'Followers', SELF_ONLY: 'Only me'
};

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.message || `Request failed (${response.status})`);
  return data;
}

function showStatus(message, kind = '') {
  $('statusCard').className = `status-card ${kind}`;
  $('statusCard').textContent = message;
}

function setUnsupported(id, rowId, noteId, disabled) {
  $(id).checked = false;
  $(id).disabled = disabled;
  $(rowId).classList.toggle('disabled', disabled);
  $(noteId).textContent = disabled ? 'Unavailable in this account’s TikTok settings' : 'Off by default';
}

function renderCreator(creator) {
  state.creator = creator;
  $('connectCard').classList.add('hidden');
  $('accountCard').classList.remove('hidden');
  $('refreshCreator').classList.remove('hidden');
  $('creatorNickname').textContent = creator.creator_nickname;
  $('creatorUsername').textContent = `@${creator.creator_username}`;
  if (creator.creator_avatar_url) $('creatorAvatar').src = creator.creator_avatar_url;
  $('creatorAvatar').alt = `${creator.creator_nickname} avatar`;
  $('privacy').innerHTML = '<option value="" selected disabled>Choose who can view this post</option>';
  creator.privacy_level_options.forEach(value => {
    const option = document.createElement('option'); option.value = value;
    option.textContent = privacyLabels[value] || value; $('privacy').appendChild(option);
  });
  setUnsupported('allowComment', 'commentRow', 'commentNote', creator.comment_disabled);
  setUnsupported('allowDuet', 'duetRow', 'duetNote', creator.duet_disabled);
  setUnsupported('allowStitch', 'stitchRow', 'stitchNote', creator.stitch_disabled);
  $('connectionState').textContent = `Connected as @${creator.creator_username}`;
  updateValidation();
}

async function refreshCreator() {
  try {
    const creator = await api('/api/tiktok/creator-info', { method: 'POST' });
    renderCreator(creator);
  } catch (error) {
    $('connectionState').textContent = error.message;
    showStatus(error.message, 'error');
  }
}

async function loadConfig() {
  try {
    const config = await api('/api/publisher/config');
    state.mode = config.mode; state.connected = config.connected;
    if (config.mode === 'demo') {
      $('modeBanner').classList.add('visible');
      $('modeBanner').textContent = 'DEMO MODE — sample creator settings only. No TikTok API calls are made and Publish is blocked.';
    }
    if (config.connected) await refreshCreator();
    else $('connectionState').textContent = 'TikTok not connected';
    const params = new URLSearchParams(location.search);
    if (params.get('draft')) await claimDraft(params.get('draft'));
    if (params.get('oauth_error')) showStatus(`TikTok authorization was not completed: ${params.get('oauth_error')}`, 'error');
  } catch (error) { showStatus(error.message, 'error'); }
}

async function uploadVideo(file) {
  if (!file) return;
  $('dropZone').classList.add('loading');
  showStatus('Inspecting and importing video…');
  try {
    const result = await api('/api/publisher/video', {
      method: 'PUT', headers: { 'Content-Type': file.type, 'X-Filename': file.name }, body: file
    });
    setVideo(result.video_id, result.preview_url, result.duration_sec, result.filename);
    showStatus('Video imported. Review the preview and publishing settings.', 'success');
  } catch (error) { showStatus(error.message, 'error'); }
  finally { $('dropZone').classList.remove('loading'); }
}

function setVideo(videoId, previewUrl, duration, filename) {
  state.videoId = videoId; state.duration = Number(duration);
  $('confirmation').checked = false;
  $('videoPreview').src = previewUrl; $('videoPreview').classList.remove('hidden');
  $('videoMeta').classList.remove('hidden'); $('videoName').textContent = filename || 'VidGen render';
  $('videoDuration').textContent = `${state.duration.toFixed(1)} sec`;
  updateValidation();
}

async function claimDraft(draftId) {
  try {
    const draft = await api(`/api/publisher/drafts/${encodeURIComponent(draftId)}/claim`, { method: 'POST' });
    setVideo(draft.video_id, draft.preview_url, draft.duration_sec, draft.title);
    $('caption').value = draft.caption || ''; $('caption').dispatchEvent(new Event('input'));
    showStatus('VidGen handoff loaded. Review and edit everything before publishing.', 'success');
  } catch (error) { showStatus(error.message, 'error'); }
}

function updateCommercial() {
  const enabled = $('commercialContent').checked;
  $('commercialOptions').classList.toggle('hidden', !enabled);
  if (!enabled) { $('yourBrand').checked = false; $('brandedContent').checked = false; }
  const privatePost = $('privacy').value === 'SELF_ONLY';
  $('brandedContent').disabled = privatePost;
  $('brandedRow').classList.toggle('disabled', privatePost);
  if (privatePost && $('brandedContent').checked) $('brandedContent').checked = false;
  const branded = $('brandedContent').checked;
  $('commercialMessage').textContent = branded ? 'This video will be labeled “Paid partnership”.' :
    ($('yourBrand').checked ? 'This video will be labeled “Promotional content”.' : '');
  $('brandedConsent').innerHTML = branded ? ' and <a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noopener">Branded Content Policy</a>' : '';
  updateValidation();
}

function updateValidation() {
  const commercialValid = !$('commercialContent').checked || $('yourBrand').checked || $('brandedContent').checked;
  const durationValid = state.creator && state.duration > 0 && state.duration <= state.creator.max_video_post_duration_sec;
  $('publishButton').disabled = !(state.connected && state.videoId && $('privacy').value && commercialValid && durationValid && $('confirmation').checked) || state.mode === 'demo';
  if (state.creator && state.duration > state.creator.max_video_post_duration_sec) {
    showStatus(`This video is ${state.duration.toFixed(1)} seconds. @${state.creator.creator_username} can currently post up to ${state.creator.max_video_post_duration_sec} seconds.`, 'error');
  }
}

function invalidateConfirmation() {
  $('confirmation').checked = false;
  updateValidation();
}

async function publish(event) {
  event.preventDefault();
  $('publishButton').disabled = true; showStatus('Refreshing creator settings before publish…');
  try {
    const result = await api('/api/tiktok/publish', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_id: state.videoId, caption: $('caption').value, privacy_level: $('privacy').value,
        allow_comment: $('allowComment').checked, allow_duet: $('allowDuet').checked,
        allow_stitch: $('allowStitch').checked, commercial_content: $('commercialContent').checked,
        your_brand: $('yourBrand').checked, branded_content: $('brandedContent').checked,
        is_aigc: $('isAigc').checked, confirmed: $('confirmation').checked
      })
    });
    showStatus('Submitted to TikTok. Processing may take a few minutes; keep this page open.', 'success');
    pollStatus(result.publish_id);
  } catch (error) { showStatus(error.message, 'error'); updateValidation(); }
}

function pollStatus(publishId) {
  clearInterval(state.polling);
  const check = async () => {
    try {
      const result = await api(`/api/tiktok/status/${encodeURIComponent(publishId)}`, { method: 'POST' });
      if (result.status === 'PUBLISH_COMPLETE') {
        clearInterval(state.polling); showStatus('Publish complete. The post may still be finishing TikTok moderation.', 'success');
      } else if (result.status === 'FAILED') {
        clearInterval(state.polling); showStatus(`TikTok could not publish this video: ${result.fail_reason || 'unknown reason'}`, 'error');
      } else showStatus(`TikTok status: ${result.status}. Processing may take a few minutes.`);
    } catch (error) { clearInterval(state.polling); showStatus(error.message, 'error'); }
  };
  check(); state.polling = setInterval(check, 5000);
}

$('videoInput').addEventListener('change', e => uploadVideo(e.target.files[0]));
['dragenter', 'dragover'].forEach(name => $('dropZone').addEventListener(name, e => { e.preventDefault(); $('dropZone').classList.add('loading'); }));
['dragleave', 'drop'].forEach(name => $('dropZone').addEventListener(name, e => { e.preventDefault(); $('dropZone').classList.remove('loading'); }));
$('dropZone').addEventListener('drop', e => uploadVideo(e.dataTransfer.files[0]));
$('caption').addEventListener('input', () => {
  $('captionCount').textContent = $('caption').value.length;
  invalidateConfirmation();
});
$('refreshCreator').addEventListener('click', refreshCreator);
$('disconnectButton').addEventListener('click', async () => { try { await api('/api/tiktok/disconnect', { method: 'POST' }); location.reload(); } catch (error) { showStatus(error.message, 'error'); } });
['privacy','commercialContent','yourBrand','brandedContent'].forEach(id => $(id).addEventListener('change', () => {
  invalidateConfirmation();
  updateCommercial();
}));
['allowComment','allowDuet','allowStitch','isAigc'].forEach(id => $(id).addEventListener('change', invalidateConfirmation));
$('confirmation').addEventListener('change', updateValidation);
$('publishForm').addEventListener('submit', publish);
loadConfig();
