#!/usr/bin/env node
import { archiveSource } from './all-family-support.mjs';
const label = process.argv[2];
console.log(JSON.stringify(archiveSource(label, process.argv.slice(3)), null, 2));
