export default class Permission {
  // Private members
  private permissions: NotificationPermission[];
  private win: Global;

  // Public members
  GRANTED: 'granted';
  DEFAULT: 'default';
  DENIED: 'denied';

  constructor(win: Global) {
    this.win = win;
    this.GRANTED = 'granted';
    this.DEFAULT = 'default';
    this.DENIED = 'denied';
    this.permissions = [this.GRANTED, this.DEFAULT, this.DENIED];
  }

  /**
   * Requests permission for desktop notifications
   * @param {Function} onGranted - Function to execute once permission is granted
   * @param {Function} onDenied - Function to execute once permission is denied
   * @return {void, Promise}
   */
  request(onGranted?: () => void, onDenied?: () => void) {
    return arguments.length > 0
      ? this.requestWithCallback(onGranted, onDenied)
      : this._requestAsPromise();
  }

  /**
   * Old permissions implementation deprecated in favor of a promise based one
   * @deprecated Since V1.0.4
   * @param {Function} onGranted - Function to execute once permission is granted
   * @param {Function} onDenied - Function to execute once permission is denied
   * @return {void}
   */
  private requestWithCallback(onGranted: () => void, onDenied: () => void) {
    const existing = this.get();

    const resolve = (result = this.win.Notification.permission) => {
      if (typeof result === 'undefined' && this.win.webkitNotifications)
        result = this.win.webkitNotifications.checkPermission();
      if (result === this.GRANTED || result === 0) {
        if (onGranted) onGranted();
      } else if (onDenied) onDenied();
    };

    /* Permissions already set */
    if (existing !== this.DEFAULT) {
      resolve(existing);
    } else if (
      this.win.webkitNotifications &&
      this.win.webkitNotifications.checkPermission
    ) {
      /* Safari 6+, Legacy webkit browsers */
      this.win.webkitNotifications.requestPermission(resolve);
    } else if (
      this.win.Notification &&
      this.win.Notification.requestPermission
    ) {
      /* Chrome 23+ */
      this.win.Notification.requestPermission()
        .then(resolve)
        .catch(function() {
          if (onDenied) onDenied();
        });
    } else if (onGranted) {
      /* Let the user continue by default */
      onGranted();
    }
  }

  /**
   * Requests permission for desktop notifications in a promise based way
   * @return {Promise}
   */
  _requestAsPromise(): Promise<void> {
    const existing = this.get();

    let isGranted = (result: NotificationPermission) =>
      result === this.GRANTED || result === 0;

    /* Permissions already set */
    const hasPermissions = existing !== this.DEFAULT;

    /* Safari 6+, Chrome 23+ */
    const isModernAPI =
      this.win.Notification && this.win.Notification.requestPermission;

    /* Legacy webkit browsers */
    const isWebkitAPI =
      this.win.webkitNotifications &&
      this.win.webkitNotifications.checkPermission;

    return new Promise((resolvePromise: Function, rejectPromise: Function) => {
      const resolver = (result: NotificationPermission) =>
        isGranted(result) ? resolvePromise() : rejectPromise();

      if (hasPermissions) {
        resolver(existing);
      } else if (isWebkitAPI) {
        this.win.webkitNotifications.requestPermission(
          (result: NotificationPermission) => {
            resolver(result);
          }
        );
      } else if (isModernAPI) {
        this.win.Notification.requestPermission()
          .then((result: NotificationPermission) => {
            resolver(result);
          })
          .catch(rejectPromise);
      } else resolvePromise();
    });
  }

  /**
   * Returns whether Push has been granted permission to run
   * @return {Boolean}
   */
  has() {
    return this.get() === this.GRANTED;
  }

  /**
   * Gets the permission level
   * @return {Permission} The permission level
   */
  get(): NotificationPermission {
    let permission: NotificationPermission;

    /* Safari 6+, Chrome 23+ */
    if (this.win.Notification && this.win.Notification.permission)
      permission = this.win.Notification.permission;
    else if (
      this.win.webkitNotifications &&
      this.win.webkitNotifications.checkPermission
    )
      /* Legacy webkit browsers */
      permission = this.permissions[
        this.win.webkitNotifications.checkPermission()
      ];
    else if (navigator.mozNotification)
      /* Firefox Mobile */
      permission = this.GRANTED;
    else if (this.win.external && this.win.external.msIsSiteMode)
      /* IE9+ */
      permission = this.win.external.msIsSiteMode()
        ? this.GRANTED
        : this.DEFAULT;
    else permission = this.GRANTED;

    return permission;
  }
}
