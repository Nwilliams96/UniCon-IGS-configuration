// Local previews stay local. Published project-site aliases use the preferred URL.
(() => {
  const hosted = ["www.nathanlrwilliams.com", "nathanlrwilliams.com", "nwilliams96.github.io"]
    .includes(window.location.hostname.toLowerCase());
  const alias = /^\/(?:eASV-Pipeline-Tutorial|UniCon-IGS-configuration)(?:\/index\.html)?\/?$/.test(window.location.pathname);
  if (hosted && alias) {
    window.location.replace("https://www.nathanlrwilliams.com/UniCon-IGS/" + window.location.search + window.location.hash);
  }
})();
