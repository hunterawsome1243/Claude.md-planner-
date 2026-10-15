# Shipyard Planner: how to use it

Open `index.html` in your browser, or see the [README](../README.md) for running and hosting it.

Shipyard is where you plan a project, and Claude Code is where it gets built. You go back and forth between the two, one task at a time. The same guide is inside the app: choose **Help** in the project list, or press **?**.

## Your first project

1. **Start it.** Choose **New**, give it a name and a sentence about the idea, and pick what kind of project it is (web app, game, phone app and so on). Already have code? Choose **Have Claude Code describe your code** instead, and Shipyard fills itself in from what Claude Code finds.
2. **Describe it.** On **Overview**, say who it is for and what "done" looks like. **Design** holds the features, screens and data.
3. **Plan it.** On **Plan**, keep tasks small enough for one Claude Code session. A large task gets a **Split** button.
4. **Set up the folder.** On **Project files**, choose **Get the setup prompt** and paste it into Claude Code, started in your project's folder. It saves CLAUDE.md, PLAN.md and the other files Claude Code reads. **Start Claude Code** shows how to install and open it.

## Every working session

1. On **Overview**, **Next up** shows the next task. Choose **Get the task prompt** and paste it into Claude Code.
2. When Claude Code finishes, choose **Log a session** and paste its summary. Shipyard marks the task, suggests what is next, and turns anything that went wrong into a lesson.
3. On **Improve**, **Add to CLAUDE.md** turns a lesson into a rule Claude Code follows from then on. **Review my project** asks Claude for risks and missing pieces.
4. If Overview says **Your project's folder is behind**, choose **Get the update prompt** and paste it into Claude Code.

## Where your projects are kept

Opened from a file or a website, Shipyard saves your projects in this browser. Clearing the browser's data for the page removes them, so choose **Back up all projects**, in the project list, now and then: it gives you one file with everything, and **Import** brings it back, on this computer or another.

Published as a claude.ai artifact, Shipyard saves to your Claude account as well, and this browser keeps a copy. If the connection drops, changes are kept in the browser and saved the next time the page connects. The buttons that ask Claude for help only appear there.

## Keys

- **Ctrl+K** (Cmd+K on a Mac) or **/**: find anything in the open project.
- **Ctrl+Z** (Cmd+Z): undo the last change that offered Undo, such as a delete.
- **Esc**: close a dialog, or stop Claude while it works.
- **?**: open Help.
