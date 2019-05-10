function getValue (obj, field, placeholder) {
  return obj[field] === undefined ? placeholder : obj[field]
}

module.exports = {
  getValue
}
