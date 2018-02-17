#!/usr/bin/env node
'use strict';
const chalk = require('chalk');
const Task = require('./task');
const Note = require('./note');

const red = chalk.bold.red; // Red bold text

function Taskbook(database) {
  // Taskbook object constructor function
  this.database = database;
}

Taskbook.prototype = {
  // Retrieve data from storage
  get data() {
    this._data = this._data || this.database.read();
    return this._data;
  }
};

Taskbook.prototype.createTask = function (description) {
  // Create new task
  const taskID = this.generateID();
  const task = new Task(taskID, description);
  this.data.push(task);
  this.write(this.data);
  return task;
};

Taskbook.prototype.createNote = function (body) {
  // Create new note
  const noteID = this.generateID();
  const note = new Note(noteID, body);
  this.data.push(note);
  this.write(this.data);
  return note;
};

Taskbook.prototype.check = function (id) {
  // Mark task as complete
  const targetTask = this.search(id);
  const targetIndex = this.data.indexOf(targetTask);
  this.data[targetIndex].isCompleted = true;
  this.write(this.data);
  return 0;
};

Taskbook.prototype.uncheck = function (id) {
  // Mark task as incomplete
  const targetTask = this.search(id);
  const targetIndex = this.data.indexOf(targetTask);
  this.data[targetIndex].isCompleted = false;
  this.write(this.data);
  return 0;
};

Taskbook.prototype.star = function (id) {
  // Mark object as starred
  const targetObject = this.search(id);
  const targetIndex = this.data.indexOf(targetObject);
  this.data[targetIndex].isStarred = true;
  this.write(this.data);
  return 0;
};

Taskbook.prototype.unstar = function (id) {
  // Mark object as unstarred
  const targetObject = this.search(id);
  const targetIndex = this.data.indexOf(targetObject);
  this.data[targetIndex].isStarred = false;
  this.write(this.data);
  return 0;
};

Taskbook.prototype.search = function (id) {
  // Search using object ID
  let targetObject;
  this.data.forEach(object => {
    if (object._id === Number(id)) {
      targetObject = object;
    }
  });
  // Check if tagret object is valid
  if (targetObject) {
    return targetObject;
  }
  console.log(red('Invalid input ID: ' + id));
  process.exit(1);
};

Taskbook.prototype.generateID = function () {
  // Generate new unused object ID
  const usedIDs = this.data.map(object => {
    return object._id;
  });
  const maxID = Math.max.apply(null, usedIDs.concat(0));
  const newID = maxID + 1;
  return newID;
};

module.exports = Taskbook;