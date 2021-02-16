const jsonfile = require('jsonfile')

const data = jsonfile.readFileSync('./db.json')

const save = () => {
    jsonfile.writeFileSync('./db.json', data)
}

module.exports = {
    data,
    save
}
