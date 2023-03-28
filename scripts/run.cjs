#!/usr/bin/env node

const { getExperience } = require('../dist/index.cjs');

getExperience(process.env.OSXP_USERNAME, process.env.TOKEN).then((res) => {
  console.log(res);
});
