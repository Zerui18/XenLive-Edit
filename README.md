# XenLive Edit

This is the companion VSCode extension to the tweak `XenLive`.

# Features

Live reloading of XenHTML widget on your iOS device as you edit!

**XenLive syncs the changes to your device when you save the file.**

To avoid always manually saving, definitely checkout vscode's `file.autoSave`! For instant hot-reloading, set `file.autoSave` to `afterDelay` and `file.autoSaveDelay` to `1`ms!

# Requirements

* Only XenHTML v2 and above are supported.
* `rsync` should be installed on this machine. See **Installing rsync** below for more details.
* SSH Public Key Authentication is required between your pc and iOS device.
* Install the `XenLive` tweak from [My Repo](https://zerui18.github.io/zx02/) on your iOS device to start editing!

# Installing rsync
For macOS & Ubuntu users, you can install `rsync` with your package manager of choice. Ensure that you have the latest version installed: `rsync --version` should give at least version 3.x.x.

For Windows users, you will need to [download cwrsync](https://itefix.net/dl/free-software/cwrsync_6.2.1_x64_free.zip), unzip the contents somewhere and set the `xenlive-edit.remote.cwrsyncBinPath` to point to the bin directory.

# SSH Public Key Authentication
To allow XenLive-Edit to sync files to your device without needing the SSH password, public key authentication is required.

First, run:

* `ssh-keygen` to generate a private/public key pair on your PC.

For **macOS & Ubuntu** users:

* `ssh-copy-id root@ideviceip` to copy the public key onto your iOS device.
* You can test if setup is successful by ssh-ing into your iOS device as `root` without a password.

For **Windows 10** users:
* `scp ~/.ssh/id_rsa.pub root@ideviceip:/tmp/id_rsa.pub` to copy the public key to your iOS device.
* SSH into you iOS device as `root` and run `cat /tmp/id_rsa.pub >> ~/.ssh/authorized_keys` to add your pc's public key to authorized keys.
**Note: Windows 10 has built-in ssh, use THE Command Prompt and THE built in scp/ssh.**

For **Windows 7** users:
* There's no built-in ssh capability. Use the `ssh-keygen` binary found in cwrsync/bin.
* Copy the public key, aka `~/.ssh/id_rsa.pub`, onto your iOS device through any preferred means.
* In the shell on your iOS device, or an ssh session, run `cat /path/to/your/id_rsa.pub >> ~/.ssh/authorized_keys`.

# Extension Settings

The following 4 settings are required for XenLive-Edit:

**The following 2 settings are recommended to be set at `User` level, which is shared among all workspaces.**
* `xenlive-edit.remote.deviceIP`: The IPv4 address through which this computer can access your phone.
* `xenlive-edit.local.cwrsyncBinPath`: Path to the bin folder of cwrsync **(Required only for Windows)**.

**The following 2 settings should only be set at `Workspace` level, as they are unique for each workspace.**
* `xenlive-edit.remote.widgetName`: The name of the widget being edited.
* `xenlive-edit.remote.widgetType`: The type of the widget being edited.

# Take Note

XenLive needs to be enabled via the `XenLive Edit: Enable` command everytime a workspace is opened, otherwise nothing would happen.

# Known Issues

TBD

Please report issues at XenLive's [Bug Tracker Repo](https://github.com/Zerui18/XenLive-Issues-Tracker).

# Release Notes

## Beta

Currently under beta-testing.