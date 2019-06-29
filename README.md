# Crowdin Visual Studio Code Plugin

The plugin lets you integrate your project with Crowdin. It enables you to upload new translations to the system instantly as well as download translations from your Crowdin project.

## Features

New component will be introduced in Activity Bar called Crowdin Explorer.
Plugin will scan each workspace for Crowdin specific configuration file and will build tree with translations.
In Crowdin Explorer you can upload those translations into Crowdin or download them from it.
![Plugin](resources/plugin.png)

## Requirements

In order to work with this plugin in workspace there should be Crowdin configuration file. It should be called either `crowdin.yml` or `crowdin.yaml`.

Here is an example configuration file:

```json
"project_identifier" : "projectId"
"api_key" : "apiKey"
"base_path" : "folder" // optional
"branch" : "master" // optional

"files": [
  {
    "source" : "/locale/en/folder1/[0-2].txt",
    "translation" : "/locale/%two_letters_code%/folder1/%original_file_name%"
  },
  {
    "source" : "/locale/en/folder2/[0-2].txt",
    "translation" : "/locale/%two_letters_code%/folder2/%original_file_name%"
  }
]
```

Properties `project_identifier`, `api_key` can be found in your project settings page.

## Extension Settings

This extension contributes the following settings:

* `tms.autoRefresh`: enable/disable auto refresh of translations tree after each change in Crowdin configuration file

## Known Issues

At the moment plugin is not support all possible properties in configuration file (see [Configuration file](https://support.crowdin.com/configuration-file/)). All properties which are supported by this plugin are listed in the example above (see Requirements section).

## Contributing

1. Fork it
2. Create your feature branch (git checkout -b my-new-feature)
3. Commit your changes (git commit -am 'Added some feature')
4. Push to the branch (git push origin my-new-feature)
5. Create new Pull Request

## Seeking Assistance

Need help working with Crowdin Visual Studio Code Plugin or have any questions?
[Contact Customer Success Service](https://crowdin.com/contacts).
