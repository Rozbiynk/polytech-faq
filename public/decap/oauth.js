// Окно входа через GitHub (/api/auth/callback): передать токен окну редактора по протоколу Decap CMS.
(function () {
  var msg = document.body.dataset.msg;
  if (!window.opener) return;
  window.addEventListener("message", function (e) {
    if (e.origin !== location.origin) return;
    window.opener.postMessage(msg, e.origin);
  });
  window.opener.postMessage("authorizing:github", location.origin);
})();
