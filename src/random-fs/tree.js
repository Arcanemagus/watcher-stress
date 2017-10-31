const path = require('path')
const fs = require('fs-extra')
const {atRandom, tempDir} = require('../helpers')
const {fileCreation: FileCreationChange, directoryCreation: DirectoryCreationChange} = require('./changes')

class Tree {
  constructor (opts) {
    this.prefix = opts.prefix || 'watcher-stress-'
    this.directoryChance = opts.directoryChance || 0.05

    this.id = 0
    this.root = opts.root

    this.directories = new Set()
    this.emptyDirectories = new Set()
    this.files = new Set()
  }

  namegen (prefix, suffix = '') {
    const name = `${prefix}${this.id}${suffix}`
    this.id++
    return name
  }

  newDirectoryName (notWithin = null) {
    return path.join(this.randomDirectory(notWithin), this.namegen('directory-'))
  }

  newFileName () {
    return path.join(this.randomDirectory(), this.namegen('file-', '.txt'))
  }

  getRoot () {
    return this.root
  }

  hasFile () {
    return this.files.size > 0
  }

  hasDirectory () {
    return this.directories.size > 0
  }

  hasEmptyDirectory () {
    return this.emptyDirectories.size > 0
  }

  randomDirectory (notWithin = null) {
    if (this.directories.size === 0) console.trace()
    let potential = Array.from(this.directories)

    if (notWithin) {
      potential = potential.filter(dirPath => !dirPath.startsWith(dirPath))

      if (potential.length === 0) {
        return path.dirname(notWithin)
      }
    }

    return atRandom(potential)
  }

  randomEmptyDirectory () {
    return atRandom(Array.from(this.emptyDirectories))
  }

  randomFile () {
    return atRandom(Array.from(this.files))
  }

  directoryWillBeAdded (dirPath) {
    this.emptyDirectories.delete(path.dirname(dirPath))
  }

  directoryWasAdded (dirPath, empty = true) {
    this.directories.add(dirPath)
    if (empty) {
      this.emptyDirectories.add(dirPath)
    }
  }

  fileWillBeAdded (filePath) {
    this.emptyDirectories.delete(path.dirname(filePath))
  }

  fileWasAdded (filePath) {
    this.files.add(filePath)
  }

  directoryWasDeleted (dirPath) {
    this.emptyDirectories.delete(dirPath)
    this.directories.delete(dirPath)
  }

  }

  fileWasDeleted (filePath) {
    return this.files.delete(filePath)
  }

  async generate (opts) {
    if (this.root) {
      await fs.mkdirs(this.root)
    } else {
      this.root = await tempDir(this.prefix)
    }

    this.directories.add(this.root)

    let directoriesRemaining = opts.directoryCount || 100
    let filesRemaining = opts.fileCount || 1000

    while (directoriesRemaining > 0 || filesRemaining > 0) {
      if (directoriesRemaining > 0 && Math.random() < this.directoryChance) {
        const ch = new DirectoryCreationChange(this)
        await ch.enact()
        directoriesRemaining--
      } else {
        const ch = new FileCreationChange(this)
        await ch.enact()
        filesRemaining--
      }
    }
  }
}

module.exports = {
  Tree
}
