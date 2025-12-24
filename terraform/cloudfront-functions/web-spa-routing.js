// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Redirect /god-mode to /god-mode/ (path pattern /god-mode/* requires trailing content)
  if (uri === "/god-mode") {
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: { location: { value: "/god-mode/" } },
    };
  }

  // Redirect /spaces to /spaces/
  if (uri === "/spaces") {
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: { location: { value: "/spaces/" } },
    };
  }

  // SPA routing: if no extension, serve index.html
  if (!uri.includes(".")) {
    request.uri = "/index.html";
  }

  return request;
}
