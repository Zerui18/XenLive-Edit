**中文版请见底部**
# XenLive Edit

This is the companion VSCode extension to the tweak `XenLive`.

# Features

Live reloading of XenHTML widget on your iOS device as you edit!

XenLive syncs the changes to your device when you save the file.

**To avoid always manually saving, definitely checkout vscode's `files.autoSave`! For instant hot-reloading, set `files.autoSave` to `afterDelay` and `files.autoSaveDelay` to `1`ms!**

# Requirements

* Only XenHTML v2 and above are supported.
* `rsync` should be installed on this machine. See **Installing rsync** below for more details.
* SSH Public Key Authentication is required between your pc and iOS device.
* Install the `XenLive` tweak from [My Repo](https://zerui18.github.io/zx02/) on your iOS device to start editing!

# Installing rsync
For macOS & Linux users, you can install `rsync` with your package manager of choice. Ensure that you have the latest version installed: `rsync --version` should give at least version 3.x.x.

For Windows users, you will need to [download cwrsync](https://itefix.net/dl/free-software/cwrsync_6.2.1_x64_free.zip), unzip the contents somewhere and set the `xenlive-edit.remote.cwrsyncBinPath` to point to the bin directory.

# SSH Public Key Authentication
To allow XenLive-Edit to sync files to your device without needing the SSH password, public key authentication is required.

First, run:

* `ssh-keygen` to generate a private/public key pair on your PC. When asked for a path to save the key, just press enter to use the default one. Do not set a passphrase for the key. (Windows 7 users please read below)

For **macOS & Linux** users:

* `ssh-copy-id root@ideviceip` to copy the public key onto your iOS device.
* You can test if setup is successful by ssh-ing into your iOS device as `root` without a password.

For **Windows** users:
* Copy the public key, aka `~/.ssh/id_rsa.pub`, onto your iOS device through any preferred means. Windows 10 users can run `scp ~/.ssh/id_rsa.pub root@ideviceip:/tmp/id_rsa.pub`.
* SSH into you iOS device as `root` and run `cat /tmp/id_rsa.pub >> ~/.ssh/authorized_keys` to add your pc's public key to authorized keys.

**Note: Windows 10 has built-in ssh, use THE Command Prompt and THE built in scp/ssh.**

**Note: Windows 7 comes with no built-in ssh capability. Use the `ssh-keygen` binary found in cwrsync/bin.**

# Extension Settings

![Settings Screenshot](ss_settings.png)
<center><i>xenlive-edit Settings</i></center>

<br>
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
* *1.0.0* First release!

<br></br>
<a id="cn"></a>
# 中文指示

这款插件需配合iOS设备上的`XenLive`插件使用。

# 功能

编辑XenHTML Widget时在关联的iOS设备上即时重载。

XenLive会在启用的文件夹内任意文件保存时与iOS端进行同步。

**要实现即时同步，请在Code设置中为当前工作区启用 `Auto Save` 。设 `files.autoSave` 为 `afterDelay` 、设 `files.autoSaveDelay` 为 `1`ms。**

# 需求

* 仅支持 XenHTML 版本2及更高
* 本机需装有 `rsync` ，安装指示见下方 **安装 rsync** 。
* 本机与iOS设备间需设置SSH公钥验证，指示见下方 **设置 SSH 公钥验证**。
* iOS设备需装有[我的Cydia源](https://zerui18.github.io/zx02/)中的 `XenLive` 插件。

# 安装 rsync
macOS 及 Linux 用户可使用任意前段软件包管理器（如： apt、homebrew）安装 `rsync` 。请注意 `rsync --version` 需大于 3.x.x 。

Windows 用户请下载 [cwrsync](https://itefix.net/dl/free-software/cwrsync_6.2.1_x64_free.zip) 。将压缩包解压到任意一个永久的路径，并将该包的 bin 文件夹的完整路径填入设置中的 `xenlive-edit.remote.cwrsyncBinPath` 。

# 设置 SSH 公钥验证
XenLive Edit需要能够在以ssh访问iOS设备时无需密码。

设置完成后试着以 `root` ssh进入iOS设备，若没有提示输入密码则设置成功。

在本机首先执行：

* `ssh-keygen` 来创建一对ssh密钥及公钥。当提示输入时直接按回车键，留空所有选项。（Windows 7用户请见下方）

**macOS & Linux** 用户:

* 请执行 `ssh-copy-id root@设备IP` 将刚生成的公钥直接安装到iOS设备上。

**Windows** 用户:

* 用任意方法将刚生成的 `id_rsa.pub` 拷贝至iOS设备路径 `/tmp/id_rsa.pub` 。Windows 10推荐执行 `scp ~/.ssh/id_rsa.pub root@设备IP:/tmp/id_rsa.pub` 。
* 以 `root` ssh进入iOS设备并执行 `cat /tmp/id_rsa.pub >> ~/.ssh/authorized_keys` 将公钥加入信任列。

**注意：Windows 10 自带ssh, 请不要使用 PuTTY 等第三方ssh。**

**注意：Windows 7没有自带的ssh功能。请用之前下载的 cwrsync/bin 中的 `ssh-keygen`。**

# 插件设置

![Settings Screenshot](ss_settings.png)
<center><i>xenlive-edit 设置页面</i></center>

<br>
使用前请完成以下4项设置：

**推荐在`用户`等级设置以下2条，从而对所有工作区生效**
* `xenlive-edit.remote.deviceIP`: iOS设备的IPv4地址。
* `xenlive-edit.local.cwrsyncBinPath`: cwrsync/bin 文件夹的本地路径。 **(Windows专用)**.

**仅在`工作区`等级设置以下2条。**
* `xenlive-edit.remote.widgetName`: 此工作区编辑的Widget的名称。
* `xenlive-edit.remote.widgetType`: 此工作区编辑的Widget的类别。

# 注意

每打开工作区时需重新执行 `XenLive Edit: Enable` 以开启同步。

# 已知问题

暂无

请在 XenLive 专属的 [Bug Tracker Repo](https://github.com/Zerui18/XenLive-Issues-Tracker) 报告.

# 版本日志

* *1.0.0*： 第一版发布