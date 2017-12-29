const Lang = imports.lang;
const St = imports.gi.St;
const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const PanelMenu = imports.ui.panelMenu;
const Clutter = imports.gi.Clutter;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const EXTENSIONDIR = Me.dir.get_path();
const Convenience = Me.imports.convenience;

const SHOW_ICON_KEY = "show-icon";

let picker;

const ScaleSwitcher = new Lang.Class({
  Name: "ScaleSwitcher",
  Extends: PanelMenu.Button,

  _init: function() {
    this.parent(0, "ScaleSwitcher");
    
    /**
     * Load scaleswitcher scheme settings
     */
    this._settings = Convenience.getSettings();
    this._settings.connect(
      "changed",
      Lang.bind(this, this._loadExtensionSettings)
    );

    /**
     * Loading gnome xsettings (for scaling purposes)
     */
    this.settings = new Gio.Settings({
      schema_id: "org.gnome.settings-daemon.plugins.xsettings"
    });
    this.scaleChangedId = this.settings.connect(
      "changed::overrides",
      Lang.bind(this, this._scalingFactorUpdated)
    );


    /**
     * ui
     */
    let _topBox = new St.BoxLayout();
    let gicon = Gio.icon_new_for_string("video-display-symbolic");
    this.icon = new St.Icon({ gicon: gicon, style_class: "system-status-icon" });
    _topBox.add_child(this.icon);
    this.txt = new St.Label({
      style_class: "badge",
      y_align: Clutter.ActorAlign.CENTER
    });
    _topBox.add_child(this.txt);
    this.actor.add_actor(_topBox);

    this.actor.connect(
      "button-press-event",
      Lang.bind(this, this._changeScalingFactor)
    );

    /**
     * set initial state
     */
    this._loadExtensionSettings();
    this._scalingFactorUpdated();
  },
  _scalingFactorUpdated: function() {
    const currentFactor = this._getScalingFactor();
    this.txt.text = "×" + currentFactor;
  },
  _changeScalingFactor: function() {
    const targetFactor = this._getScalingFactor() == 1 ? 2 : 1;

    // Get current overrides values
    let currentValues = this._getCurrentValues();

    // We overwrite WindowScalingFactor
    currentValues["Gdk/WindowScalingFactor"] = new GLib.Variant.new(
      "i",
      targetFactor
    );

    // Save values
    let v = this.settings.set_value(
      "overrides",
      GLib.Variant.new("a{sv}", currentValues)
    );

    this._forceUpdateDesktopInterfaceScalingFactor();

    this._syncSettings();
  },
  /**
   * Get current values as a hash table of variants, in order of overwriting them
   */
  _getCurrentValues: function() {
    const values = this._getOverridesUnpacked();
    let currentValues = {};
    for (let key of Object.keys(values)) {
      let variantForKey = values[key].get_variant();
      if (variantForKey !== null) {
        currentValues[key] = variantForKey;
      }
    }
    return currentValues;
  },
  _getScalingFactor: function() {
    const values = this._getOverridesUnpacked();
    if (values["Gdk/WindowScalingFactor"]) {
      return values["Gdk/WindowScalingFactor"].get_int32();
    } else {
      return 1;
    }
  },
  _getOverridesUnpacked: function() {
    return this.settings.get_value("overrides").deep_unpack();
  },
  /**
   * Some issues found on debian 9 with gnome-shell 3.22.3 (maybe more? maybe missing something?)
   * org.gnome.settings-daemon.plugins.xsettings > overrides -> /Gdk/WindowScalingFactor get unsynced with
   * org.gnome.desktop.interface > scaling-factor
   */
  _forceUpdateDesktopInterfaceScalingFactor: function() {
    const settings = new Gio.Settings({
      schema_id: "org.gnome.desktop.interface"
    });
    settings.set_uint("scaling-factor", this._getScalingFactor());
  },
  /**
   * Make _real_ sure settings are applied
   * (not sure this is necessary)
   */
  _syncSettings: function() {
    Gio.Settings.sync();
    resetWm();
  },
  _loadExtensionSettings: function() {
    if (this._settings.get_boolean (SHOW_ICON_KEY)) {
      this.icon.show();
    } else {
      this.icon.hide();
    }
  }
});

/**
 * Resetting Main.wm 
 * Main.wm not present on ubuntu 17.10; stil wip on ubuntu wayland
 */
function resetWm() {
  if (Main.wm) {
    Main.wm._reset();
  }
}

function init() {}

function enable() {
  picker = new ScaleSwitcher();
  Main.panel.addToStatusArea("ScaleSwitcher-control", picker);
}

function disable() {
  picker.destroy();
  resetWm();
}
