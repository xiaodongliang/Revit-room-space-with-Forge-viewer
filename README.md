# Revit-room-space-with-Forge-viewer
This is a sample code to create room space shape for a Revit file, and show up in Forge Viewer

This sample is the combination of other repositories:
https://github.com/wallabyway/rooms-spaces-revit-plugin
https://github.com/ogaryu/learn.forge.designautomation


Follow the steps below:

1. follow the steps in the repo to setup the enviorment:
https://github.com/ogaryu/learn.forge.designautomation/tree/master/forgesample
2. add neccessary references of Revit in the project **updateRVTParam**. The sample reuses the skeleton of the other repo, so the project name is not changed. Build the plugin of Revit
3. build the project forgesample
4. follow the steps in the repo to create appbundle and activity
https://github.com/ogaryu/learn.forge.designautomation/tree/master/forgesample
5. upload a Revit file
6. run work item
7. after it succeeds, start translation
8. aftter translation done, load it in viewer
9. check room shape in the viewer under [Gereric Models]
