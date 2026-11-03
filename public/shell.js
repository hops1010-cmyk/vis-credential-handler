const frame = document.getElementById("vaultFrame");
const publicOrigin = "https://www.vistamations.com";
if (/^#handoff=[a-f0-9]{64}$/.test(location.hash)) {
  const target = new URL("./ui", location.href);
  target.hash = location.hash;
  frame.src = target.href;
  history.replaceState(null, "", location.pathname + location.search);
}
window.addEventListener("message", (event) => {
  if (
    event.origin !== location.origin ||
    event.source !== frame.contentWindow ||
    event.data?.type !== "cody-vault-handoff"
  )
    return;
  let target;
  try {
    target = new URL(event.data.url);
  } catch {
    return;
  }
  if (
    target.origin === publicOrigin &&
    target.pathname === "/cody-vault/" &&
    /^#handoff=[a-f0-9]{64}$/.test(target.hash)
  )
    location.assign(target.href);
});
