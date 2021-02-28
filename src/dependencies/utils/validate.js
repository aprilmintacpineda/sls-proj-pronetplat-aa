const validationRules = {
  email (value) {
    return (
      value.length > 320 ||
      // eslint-disable-next-line
      !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
        value
      )
    );
  },
  url (value) {
    return (
      value.length > 1000 ||
      /^http:\/\//.test(value) ||
      // eslint-disable-next-line
      !/(?:(?:http|https):\/\/)?([-a-zA-Z0-9.]{2,256}\.[a-z]{2,10})\b(?:\/[-a-zA-Z0-9@:%_+.~#?&//=]*)?/gim.test(
        value
      )
    );
  },
  contactOther (value) {
    return !this.email(value) || !this.url(value);
  },
  required (value) {
    return !value || !value.length;
  },
  maxLength (value, [max]) {
    return value.length > max;
  },
  password (value) {
    const minLength = 8;
    const maxLength = 30;
    const len = value.length;

    return (
      len < minLength ||
      len > maxLength ||
      (value.match(/[0-9]/gm) || []).length < 2 ||
      (value.match(/[a-z]/gm) || []).length < 2 ||
      (value.match(/[A-Z]/gm) || []).length < 2 ||
      (
        value.match(
          /[\s\!@#$%^&*()_\-\+=\{\}\[\]|\\;:"'<>?,.\/]/gm // eslint-disable-line
        ) || []
      ).length < 2
    );
  },
  options (value, options) {
    if (value.constructor === Array)
      return value.find(val => !options.includes(val));
    return !options.includes(value);
  },
  matches (value, [payload]) {
    return value !== payload;
  }
};

function validate (value, rules) {
  const isOptional = !rules.includes('required');
  if (!value && isOptional) return false;

  return Boolean(
    rules.find(definition => {
      let rule = definition;
      let payload = [];

      const hasParameters = rule.includes(':');
      if (hasParameters) {
        const [_rule, _payload] = rule.split(':');
        rule = _rule;
        payload = _payload.split(',');
      }

      const error = validationRules[rule](value, payload);
      if (error) return true;
    })
  );
}

module.exports = validate;
