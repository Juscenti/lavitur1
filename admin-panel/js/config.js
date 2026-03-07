// API base URL — production: https://lavitur.onrender.com; local dev: http://localhost:5000
// When on localhost, set localStorage.getItem('lavitur_use_production_api') to '1' to use Render API without running backend locally.
if (typeof window !== "undefined" && !window.API_BASE) {
  var useProduction = typeof localStorage !== "undefined" && localStorage.getItem("lavitur_use_production_api") === "1";
  var isLocal = /^localhost$|^127\.0\.0\.1$/i.test(window.location.hostname);
  window.API_BASE = (isLocal && !useProduction) ? "http://localhost:5000" : "https://lavitur.onrender.com";
}
