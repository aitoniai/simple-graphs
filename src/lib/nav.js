let navigatedInApp = false;

export function go(path, { replace = false } = {}) {
  if (replace) {
    location.replace('#' + path);
  } else {
    navigatedInApp = true;
    location.hash = path;
  }
}

// Uses the browser's history when possible so the back gesture and back button agree.
export function back() {
  if (navigatedInApp) history.back();
  else go('/', { replace: true });
}
