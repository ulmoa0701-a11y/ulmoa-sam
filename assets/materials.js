(() => {
  const dialog = document.getElementById('materialDialog');
  const close = document.getElementById('materialDialogClose');
  const title = document.getElementById('materialDialogTitle');
  const meta = document.getElementById('materialDialogMeta');
  const desc = document.getElementById('materialDialogDesc');
  const cover = document.getElementById('materialDialogCover');
  const image = document.getElementById('materialDialogImage');
  const download = document.getElementById('materialDownload');
  const preview = document.getElementById('materialPreview');
  const thread = document.getElementById('materialThread');

  document.querySelectorAll('.book-button').forEach((button) => {
    button.addEventListener('click', () => {
      title.textContent = button.dataset.title || '';
      meta.textContent = button.dataset.meta || '';
      desc.textContent = button.dataset.desc || '';
      const downloadUrl = button.dataset.download || '#';
      download.href = downloadUrl;
      if (downloadUrl.startsWith('../')) download.setAttribute('download', '');
      else download.removeAttribute('download');
      preview.href = button.dataset.preview || downloadUrl;

      const imageUrl = button.dataset.image || '';
      cover.hidden = !imageUrl;
      image.src = imageUrl;
      image.alt = imageUrl ? (button.dataset.title || '자료') + ' 미리보기' : '';

      const threadUrl = button.dataset.thread || '';
      thread.hidden = !threadUrl;
      if (threadUrl) thread.href = threadUrl;

      dialog.showModal();
    });
  });

  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
})();