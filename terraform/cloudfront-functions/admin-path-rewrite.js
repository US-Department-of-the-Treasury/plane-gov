// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Strip /god-mode prefix
  uri = uri.replace(/^\/god-mode/, "") || "/";

  // SPA routing: if no extension, serve index.html
  if (!uri.includes(".") || uri === "/") {
    uri = "/index.html";
  }

  request.uri = uri;
  return request;
}
