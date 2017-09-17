const Lang = imports.lang;
const St = imports.gi.St;
const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const PanelMenu = imports.ui.panelMenu;
const Clutter = imports.gi.Clutter;


const Me = imports.misc.extensionUtils.getCurrentExtension();

let picker;

const ScaleSwitcher = new Lang.Class({
    Name: 'ScaleSwitcher',
    Extends: PanelMenu.Button,

    _init: function () {

        this.parent(0, "ScaleSwitcher");

        this.settings = new Gio.Settings({ schema_id: "org.gnome.desktop.interface" });

        let _topBox = new St.BoxLayout();
        let gicon=Gio.icon_new_for_string(Me.path + "/icons/ruler.svg");
        let icon = new St.Icon({ gicon: gicon, style_class: 'system-status-icon'});
        this.txt =  new St.Label({
            style_class: 'badge',
            y_align: Clutter.ActorAlign.CENTER
        });
        _topBox.add_child(icon);
        _topBox.add_child(this.txt);
        this.actor.add_actor(_topBox);

        this.scaleChangedId = this.settings.connect('changed::scaling-factor', Lang.bind(this, this._scaleUpdated));

        this.actor.connect('button-press-event', Lang.bind(this, this._changeScaleFactor));
        this._scaleUpdated();
    },
    _scaleUpdated : function() {
        const currentFactor = this.settings.get_uint("scaling-factor");
        this.txt.text = "×" + currentFactor;
    },
    _changeScaleFactor : function() {
        const targetFactor = this.settings.get_uint("scaling-factor") == 1?  2 : 1;
        this.settings.set_uint("scaling-factor", targetFactor);
    },
    stop: function () {
        this.settings.disconect(this.scaleChangedId);
    }
});



function init() { }

function enable() {
    picker = new ScaleSwitcher();
    Main.panel.addToStatusArea('ScaleSwitcher-control', picker);
}


function disable() {
    picker.stop();
    picker.destroy();
}
