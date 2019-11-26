# Crowdin Visual Studio Code Plugin

[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/Crowdin.vscode-crowdin?logo=visual-studio-code&cacheSeconds=3000)](https://marketplace.visualstudio.com/items?itemName=Crowdin.vscode-crowdin)
[![Visual Studio Marketplace Rating (Stars)](https://img.shields.io/visual-studio-marketplace/stars/Crowdin.vscode-crowdin?logo=visual-studio-code&cacheSeconds=3000)](https://marketplace.visualstudio.com/items?itemName=Crowdin.vscode-crowdin&ssr=false#review-details)
[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/Crowdin.vscode-crowdin?cacheSeconds=3000)](https://marketplace.visualstudio.com/items?itemName=Crowdin.vscode-crowdin)

Integrate your Visual Studio projects with Crowdin to optimize the localization process. Plugin allows uploading new source strings instantly to your Crowdin project and downloading translations.

[Get it from the VS Code Marketplace →](https://marketplace.visualstudio.com/items?itemName=Crowdin.vscode-crowdin)

## Features

New component will be introduced in Activity Bar called *Crowdin Explorer*.
Plugin will scan each workspace for Crowdin specific configuration file and will build tree with translations.
In *Crowdin Explorer* you can upload those translations into Crowdin or download them from it.

![Plugin](resources/plugin.png)

## Configuration

To work with plugin in the Visual Studio workspace, there should be Crowdin configuration file called either `crowdin.yml` or `crowdin.yaml`.

Configuration file example:

```json
"project_identifier": "projectId"
"api_key": "apiKey"
"base_path": "folder" // optional
"branch": "master" // optional

"files": [
  {
    "source": "/locale/en/folder1/[0-2].txt",
    "translation": "/locale/%two_letters_code%/folder1/%original_file_name%"
  },
  {
    "source": "/locale/en/folder2/[0-2].txt",
    "translation": "/locale/%two_letters_code%/folder2/%original_file_name%"
  }
]
```

Properties `project_identifier`, `api_key` can be found in your project settings page.

## Setup

1. Prepare `crowdin.yml` or `crowdin.yaml` configuration file and add it to the needed workspace in Visual Studio.
2. Install *Crowdin* plugin using one of the following methods:
    * open VS Code Extensions (**Ctrl+Shift+X**), search for *Crowdin* and click **Install**

      or

    * launch VS Code Quick Open (**Ctrl+P**), paste the below command, and press **Enter**
        ```
        ext install Crowdin.vscode-crowdin
        ```
3. *Crowdin* plugin scans each Visual Studio workspace to find Crowdin configuration file (*crowdin.yml* or *crowdin.yaml*). It automatically builds the tree with source files in *Crowdin Explorer* component available on your Activity Bar.
4. Use upward and downward arrows in *Crowdin Explorer* component to upload source files to Crowdin and download translations correspondingly.

## Extension Settings

This extension contributes the following settings:

* `tms.autoRefresh`: enable/disable auto refresh of translations tree after each change in Crowdin configuration file

## Known Issues

At the moment plugin is not support all possible properties in configuration file (see [Configuration file](https://support.crowdin.com/configuration-file/)). All properties which are supported by this plugin are listed in the example above (see Requirements section).

## Contribution
We are happy to accept contributions to the Crowdin Visual Studio Code Plugin. To contribute please do the following:
1. Fork the repository on GitHub.
2. Decide which code you want to submit. Commit your changes and push to the new branch.
3. Ensure that your code adheres to standard conventions, as used in the rest of the library.
4. Ensure that there are unit tests for your code.
5. Submit a pull request with your patch on Github.

## Seeking Assistance

If you find any problems or would like to suggest a feature, please feel free to file an issue on Github at [Issues Page](https://github.com/crowdin/vscode-crowdin/issues).

Need help working with Crowdin Visual Studio Code Plugin or have any questions?
[Contact Customer Success Service](https://crowdin.com/contacts).

## License
<pre>
Copyright © 2019 Crowdin

The Crowdin Visual Studio Code Plugin is licensed under the MIT License.
See the LICENSE file distributed with this work for additional
information regarding copyright ownership.

Except as contained in the LICENSE file, the name(s) of the above copyright
holders shall not be used in advertising or otherwise to promote the sale,
use or other dealings in this Software without prior written authorization.
</pre>
