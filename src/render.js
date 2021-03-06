'use strict';
const chalk = require('chalk');
const signale = require('signale');
const config = require('./config');

signale.config({displayLabel: false});

const {await: wait, error, log, note, pending, success} = signale;
const {blue, green, grey, magenta, red, underline, yellow} = chalk;

const priorities = {2: 'yellow', 3: 'red'};

class Render {
  get _configuration() {
    return config.get();
  }

  get dailyScratchDesc() {
    return "daily_scratch";
  }

  get notesBoard() {
    return "@Notes";
  }

  _colorBoards(boards) {
    return boards.map(x => grey(x)).join(' ');
  }

  _isBoardComplete(items) {
    const {tasks, complete, notes} = this._getItemStats(items);
    return tasks === complete && notes === 0;
  }

  _getAge(birthday) {
    const daytime = 24 * 60 * 60 * 1000;
    const age = Math.round(Math.abs((birthday - Date.now()) / daytime));
    return (age === 0) ? '' : grey(`${age}d`);
  }

  _getCorrelation(items) {
    const {tasks, complete} = this._getItemStats(items);
    return grey(`[${complete}/${tasks}]`);
  }

  _getItemStats(items) {
    let [tasks, complete, notes] = [0, 0, 0];

    items.forEach(item => {
      if (item._isTask) {
        tasks++;
        if (item.isComplete) {
          return complete++;
        }
      }

      return notes++;
    });

    return {tasks, complete, notes};
  }

  _getStar(item) {
    return item.isStarred ? yellow('★') : '';
  }

  _getContext(item) {
    if (item.context) {
      return `+${item.context}`;
    }

    return '';
  }

  _buildTitle(key, items) {
    const title = (key === new Date().toDateString()) ? `${underline(key)} ${grey('[Today]')}` : underline(key);
    const correlation = this._getCorrelation(items);
    return {title, correlation};
  }

  _buildPrefix(item) {
    const prefix = [];

    const {_id} = item;
    prefix.push(' '.repeat(4 - String(_id).length));
    prefix.push(grey(`${_id}.`));

    return prefix.join(' ');
  }

  _buildCommentsMessage(item, showShortDescription=false) {
    let commentMsg = null;
    const commentThreshold = 100;

    if (showShortDescription && item.comments.length > 100) {
      commentMsg = `${item.comments.substring(0, 97)}...`;
    } else {
      commentMsg = item.comments;
    }
    const indent = [' '.repeat(8 - String(item._id).length)];
    let comments = commentMsg
          .split('\n')
          .map((line, index) => `${indent.join('')}${line}`)
          .join('\n')

    return green(comments);
  }

  _buildMessage(item) {
    const message = [];

    const {isComplete, description} = item;
    const priority = parseInt(item.priority, 10);

    if (!isComplete && priority > 1) {
      message.push(underline[priorities[priority]](description));
    } else {
      message.push(isComplete ? grey(description) : description);
    }

    if (!isComplete && priority > 1) {
      message.push(priority === 2 ? yellow('(!)') : red('(!!)'));
    }

    return message.join(' ');
  }

  _displayTitle(board, items) {
    const {title: message, correlation: suffix} = this._buildTitle(board, items);
    const titleObj = {prefix: '\n ', message, suffix};

    return log(titleObj);
  }

  _displayItemByBoard(item, showShortDescription=false) {
    const {_isTask, isComplete, inProgress} = item;
    const age = this._getAge(item._timestamp);
    const star = this._getStar(item);
    const context = this._getContext(item);

    let prefix = this._buildPrefix(item);
    let message = this._buildMessage(item);
    if (context) {
      message = message.replace(`+${context}`);
    }
    let suffix = (age.length === 0) ? star : `${age} ${star}`;

    if (context) {
      let Reset = "\x1b[0m";
      let BgRed = "\x1b[41m"
      let FgYellow = "\x1b[33m"
      let BgYellow = "\x1b[43m"
      message = `${BgYellow}${context}${Reset} ${message} `
    }
    let msgObj = {prefix, message, suffix};

    if (_isTask) {
      isComplete ? success(msgObj) : inProgress ? wait(msgObj) : pending(msgObj);
    } else {
      note(msgObj);
    }

    if (item.comments) {
      message = this._buildCommentsMessage(item, showShortDescription);
      msgObj = {prefix:"", message, suffix:""};
      log(msgObj);
    }

    return 0;
  }

  _displayItemByDate(item) {
    const {_isTask, isComplete, inProgress} = item;
    const boards = item.boards.filter(x => x !== 'My Board');
    const star = this._getStar(item);

    let prefix = this._buildPrefix(item);
    let message = this._buildMessage(item);
    let suffix = `${this._colorBoards(boards)} ${star}`;

    let msgObj = {prefix, message, suffix};

    if (_isTask) {
      isComplete ? success(msgObj) : inProgress ? wait(msgObj) : pending(msgObj);
    } else {
      note(msgObj);
    }

    if (item.comments) {
      message = this._buildCommentsMessage(item);
      msgObj = {prefix:"", message, suffix:""};
      log(msgObj);
    }

    return 0;
  }

  displayByBoard(data) {
    Object.keys(data).forEach(board => {
      if (this._isBoardComplete(data[board]) && !this._configuration.displayCompleteTasks) {
        return;
      }

      this._displayTitle(board, data[board]);
      data[board].forEach(item => {
        if (item._isTask && item.isComplete && !this._configuration.displayCompleteTasks) {
          return;
        }

        this._displayItemByBoard(item, true);
      });
    });
  }

  displayByDate(data) {
    Object.keys(data).forEach(date => {
      if (this._isBoardComplete(data[date]) && !this._configuration.displayCompleteTasks) {
        return;
      }

      this._displayTitle(date, data[date]);
      data[date].forEach(item => {
        if (item._isTask && item.isComplete && !this._configuration.displayCompleteTasks) {
          return;
        }

        this._displayItemByDate(item);
      });
    });
  }

  displayStats({percent, complete, inProgress, pending, notes}) {
    if (!this._configuration.displayProgressOverview) {
      return;
    }

    percent = percent >= 75 ? green(`${percent}%`) : percent >= 50 ? yellow(`${percent}%`) : `${percent}%`;

    const status = [
      `${green(complete)} ${grey('done')}`,
      `${blue(inProgress)} ${grey('in-progress')}`,
      `${magenta(pending)} ${grey('pending')}`,
      `${blue(notes)} ${grey(notes === 1 ? 'note' : 'notes')}`
    ];

    if (complete !== 0 && inProgress === 0 && pending === 0 && notes === 0) {
      log({prefix: '\n ', message: 'All done!', suffix: yellow('★')});
    }

    if (pending + inProgress + complete + notes === 0) {
      log({prefix: '\n ', message: 'Type `tb --help` to get started!', suffix: yellow('★')});
    }

    log({prefix: '\n ', message: grey(`${percent} of all tasks complete.`)});
    log({prefix: ' ', message: status.join(grey(' · ')), suffix: '\n'});
  }

  invalidCustomAppDir(path) {
    const [prefix, suffix] = ['\n', red(path)];
    const message = 'Custom app directory was not found on your system:';
    error({prefix, message, suffix});
  }

  invalidID(id) {
    const [prefix, suffix] = ['\n', grey(id)];
    const message = 'Unable to find item with id:';
    error({prefix, message, suffix});
  }

  invalidIDsNumber() {
    const prefix = '\n';
    const message = 'More than one ids were given as input';
    error({prefix, message});
  }

  invalidPriority() {
    const prefix = '\n';
    const message = 'Priority can only be 1, 2 or 3';
    error({prefix, message});
  }

  markComplete(ids) {
    if (ids.length === 0) {
      return;
    }

    const [prefix, suffix] = ['\n', grey(ids.join(', '))];
    const message = `Checked ${ids.length > 1 ? 'tasks' : 'task'}:`;
    success({prefix, message, suffix});
  }

  markIncomplete(ids) {
    if (ids.length === 0) {
      return;
    }

    const [prefix, suffix] = ['\n', grey(ids.join(', '))];
    const message = `Unchecked ${ids.length > 1 ? 'tasks' : 'task'}:`;
    success({prefix, message, suffix});
  }

  markStartOfDay() {
    success({
      prefix:"\n", 
      message:`Started ${new Date().toLocaleDateString()}`,
      suffix:""
    });
  }

  markStarted(ids) {
    if (ids.length === 0) {
      return;
    }

    const [prefix, suffix] = ['\n', grey(ids.join(', '))];
    const message = `Started ${ids.length > 1 ? 'tasks' : 'task'}:`;
    success({prefix, message, suffix});
  }

  markPaused(ids) {
    if (ids.length === 0) {
      return;
    }

    const [prefix, suffix] = ['\n', grey(ids.join(', '))];
    const message = `Paused ${ids.length > 1 ? 'tasks' : 'task'}:`;
    success({prefix, message, suffix});
  }

  markStarred(ids) {
    if (ids.length === 0) {
      return;
    }

    const [prefix, suffix] = ['\n', grey(ids.join(', '))];
    const message = `Starred ${ids.length > 1 ? 'items' : 'item'}:`;
    success({prefix, message, suffix});
  }

  markUnstarred(ids) {
    if (ids.length === 0) {
      return;
    }

    const [prefix, suffix] = ['\n', grey(ids.join(', '))];
    const message = `Unstarred ${ids.length > 1 ? 'items' : 'item'}:`;
    success({prefix, message, suffix});
  }

  missingBoards() {
    const prefix = '\n';
    const message = 'No boards were given as input';
    error({prefix, message});
  }

  missingDesc() {
    const prefix = '\n';
    const message = 'No description was given as input';
    error({prefix, message});
  }

  missingID() {
    const prefix = '\n';
    const message = 'No id was given as input';
    error({prefix, message});
  }

  successComment({_id, _isTask, description}) {
    let prefix = "";
    let suffix = "";
    let message = "Commented on ";

    if (description === this.dailyScratchDesc) {
      prefix = "\n";
      message += "scratch pad";
      suffix = "";
    } else if (_isTask) {
      message += "task:";
      [prefix, suffix] = ['\n', grey(_id)];
    } else if (!_isTask) {
      message += "note:";
      [prefix, suffix] = ['\n', grey(_id)];
    }

    success({prefix, message, suffix});
  }

  successCreate({_id, _isTask}) {
    const [prefix, suffix] = ['\n', grey(_id)];
    const message = `Created ${_isTask ? 'task:' : 'note:'}`;
    success({prefix, message, suffix});
  }

  successEdit(id) {
    const [prefix, suffix] = ['\n', grey(id)];
    const message = 'Updated description of item:';
    success({prefix, message, suffix});
  }

  successDelete(ids) {
    const [prefix, suffix] = ['\n', grey(ids.join(', '))];
    const message = `Deleted ${ids.length > 1 ? 'items' : 'item'}:`;
    success({prefix, message, suffix});
  }

  successMove(id, boards) {
    const [prefix, suffix] = ['\n', grey(boards.join(', '))];
    const message = `Move item: ${grey(id)} to`;
    success({prefix, message, suffix});
  }

  successPriority(id, level) {
    const prefix = '\n';
    const message = `Updated priority of task: ${grey(id)} to`;
    const suffix = level === '3' ? red('high') : (level === '2' ? yellow('medium') : green('normal'));
    success({prefix, message, suffix});
  }

  successRestore(ids) {
    const [prefix, suffix] = ['\n', grey(ids.join(', '))];
    const message = `Restored ${ids.length > 1 ? 'items' : 'item'}:`;
    success({prefix, message, suffix});
  }

  successCopyToClipboard(ids) {
    const [prefix, suffix] = ['\n', grey(ids.join(', '))];
    const message = `Copied the ${ids.length > 1 ? 'descriptions of items' : 'description of item'}:`;
    success({prefix, message, suffix});
  }
}

module.exports = new Render();
