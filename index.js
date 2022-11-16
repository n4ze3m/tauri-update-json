require("dotenv/config");
const { Octokit } = require("octokit")
const axios = require('axios')

const main = async () => {
    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    })

    const respone = await octokit.request('GET /repos/{owner}/{repo}/releases/latest', {
        owner: 'n4ze3m',
        repo: 'habit-watcher'
    })

    const assets = respone.data.assets

    const filterPlatforms = {
        'linux-x86_64': assets.filter(asset => asset.name.includes('AppImage')),
        'darwin-x86_64': assets.filter(asset => asset.name.includes('app')),
        'windows-x86_64': assets.filter(asset => asset.name.includes('msi'))
    }
    const pub_date = respone.data.published_at
    const version = respone.data.tag_name
    const notes = `New version ${version} is available!`
    const platforms = {}

    for (const [key, value] of Object.entries(filterPlatforms)) {
        const signature = value.find(asset => asset.name.includes('.sig'))
        if (signature) {
            const signatureUrl = signature.browser_download_url
            const signatureResponse = await axios.get(signatureUrl, { responseType: 'arraybuffer' })
            const signatureBuffer = Buffer.from(signatureResponse.data, 'binary')
            const signatureBase64 = signatureBuffer.toString('base64')
            platforms[key] = {
                signature: signatureBase64,
                url: signature.browser_download_url.replace('.sig', '')
            }
        }
    }

    const update = {
        version,
        notes,
        pub_date,
        platforms
    }

    await octokit.request('PATCH /gists/{gist_id}', {
        gist_id: '548edf07e2b4fea999830fd013cbbcf2',
        description: notes,
        files: {
            'release.json': {
                content: JSON.stringify(update)
            }
        }
    })

    console.log('Done!')
}

main()