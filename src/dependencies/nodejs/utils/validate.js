const validationRules = {
  email (value) {
    if (
      value.length > 320 ||
      // eslint-disable-next-line
      !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
        value
      )
    )
      return 'Invalid email.';

    return '';
  },
  required (value) {
    if (!value || !value.length) return 'Required.';
    return '';
  },
  maxLength (value, max) {
    if (value.length > max) return `Should be less than ${max} characters.`;
    return '';
  },
  options (value, options) {
    if (value.constructor === Array) {
      if (value.find(val => !options.includes(val)))
        return 'Please select from the options.';
    } else if (!options.includes(value)) {
      return 'Please select from the options.';
    }

    return '';
  },
  matches (value, [payload, fieldName]) {
    if (value !== payload) return `${fieldName} must match.`;
    return '';
  }
};

function validate (value, rules) {
  const isOptional = !rules.includes('required');
  if (!value && isOptional) return;

  const numRules = rules.length;

  for (let a = 0; a < numRules; a++) {
    let rule = rules[a];
    let payload = [];

    const hasParameters = rule.includes(':');
    if (hasParameters) {
      const [_rule, _payload] = rule.split(':');
      rule = _rule;
      payload = _payload.split(',');
    }

    const error = validationRules[rule](value, payload);
    if (error) return error;
  }

  return '';
}

export default validate;
