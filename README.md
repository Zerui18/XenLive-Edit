# XenLive Edit

This is the companion VSCode extension to the tweak `XenLive`.

## Features

Live reloading of XenHTML widget on your iOS device as you edit!

## Requirements

* Only XenHTML v2 and above are supported.
* `rsync` should be installed on this machine. See **Installing RSync** below for more details.
* Install the `XenLive` tweak from [My Repo](https://zerui18.github.io/zx02/) on your iOS device to start editing!

## Installing RSync
For macOS & Ubuntu users, you can install `rsync` with your package manager of choice.

For Windows users, you will need to [download cwrsync](https://itefix.net/dl/free-software/cwrsync_6.2.1_x64_free.zip), unzip the contents somewhere and set the `xenlive-edit.remote.cwrsyncBinPath` to point to the bin directory.

## Extension Settings

The following 4 settings are required for XenLive-Edit:

**The following 2 settings are recommended to be set at `User` level, which is shared among all workspaces.**
* `xenlive-edit.remote.deviceIP`: The IPv4 address through which this computer can access your phone.
* `xenlive-edit.local.cwrsyncBinPath`: Path to the bin folder of cwrsync **(Required only for Windows)**.

**The following 2 settings should only be set at `Workspace` level, as they are unique for each workspace.**
* `xenlive-edit.remote.widgetName`: The name of the widget being edited.
* `xenlive-edit.remote.widgetType`: The type of the widget being edited.

## Known Issues

TBD

Please report issues at XenLive's [Bug Tracker Repo](https://github.com/Zerui18/XenLive-Issues-Tracker).

## Release Notes

### Beta

Currently under beta-testing.