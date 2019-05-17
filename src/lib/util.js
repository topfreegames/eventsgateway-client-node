function getValue (obj, field, placeholder) {
  return obj[field] === undefined ? placeholder : obj[field]
}

function getDeadline(timeout) {
  return new Date(Date.now() + parseInt(timeout))
}

module.exports = {
  getValue,
  getDeadline
}
