#!/usr/bin/env node
/*
 *  CLI that adds private info to config.plist and writes it back.
 *  Created On 13 April 2023
 */

import path from 'path'
import rupa from 'rupa'
import plist from 'plist'
import yaml from 'js-yaml'
import fs from 'fs/promises'
import { program } from 'commander'

// verbose() will turn on or off verbosity
// in the boot args
const verbose = (sample, verbose) => {
    if (verbose) sample.NVRAM.Add['7C436110-AB2A-4BBB-A880-FE41995C9F82']['boot-args'] = `${sample.NVRAM.Add['7C436110-AB2A-4BBB-A880-FE41995C9F82']['boot-args']} -v`
}

// smbios() will inject SMBIOS values
// into config.sample.plist
const smbios = async (sample, file) => {
    const smbiosFile = path.resolve(file)

    // check if smbios file exists
    // and then read it
    try {
        await fs.stat(smbiosFile)
    } catch {
        console.log(`SMBIOS file at ${smbiosFile} doesn't exist.`)
        process.exit(2)
    }

    const smbios = yaml.safeLoad(await fs.readFile(smbiosFile, { encoding: 'utf-8' }))

    sample.PlatformInfo.Generic.SystemProductName = smbios.smbios
    sample.PlatformInfo.Generic.MLB = smbios.board
    sample.PlatformInfo.Generic.SystemSerialNumber = smbios.serial
    sample.PlatformInfo.Generic.SystemUUID = smbios.uuid
}

const main = async () => {
    program.name('hackintosh-2020')
        .option('--smbios <file>', 'SMBIOS YAML file')
        .option('--out <file>', 'Compiled config.plist for OpenCore')
        .option('-v, --verbose', 'Enable or disable verbose mode.', false)
        .parse(process.argv)

    // attach rupa plugin
    rupa(program)

    // remove junk from Commander's program
    const remove = ['commands', 'options', 'parent', 'rawArgs', 'program', 'Command', 'Option', 'CommanderError', 'args']
    let args = {}
    Object.keys(program).filter(key => key.startsWith('_') == false).filter(key => remove.includes(key) == false).forEach(key => args[key] = program[key])

    // handle initial command
    if (!args.smbios || !args.out) {
        program.outputHelp()
        process.exit(0)
    }

    // read the plist file
    const sample = plist.parse(await fs.readFile('data/config.sample.plist', { encoding: 'utf-8' }))

    // inject SMBIOS values
    await smbios(sample, args.smbios)
    await verbose(sample, args.verbose)

    // write back the file
    // white converting it back into a plist file
    await fs.writeFile(path.resolve(args.out), plist.build(sample))

    console.log('✅ done!')
}

// start the cli
main()