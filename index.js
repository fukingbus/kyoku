const axios = require('axios')
const cheerio = require('cheerio')
const iconv = require('iconv-lite')
const config = require('./config.js')
const fs = require('fs')

var $
var songData = Object.assign({}, config.template)

const init = () => {
    log('===== init =====')
    crawl()
}

const crawl = () => {
    write('> Crawling...')
    let raw = get('https://www.wikihouse.com/taiko/index.php?%C2%C0%B8%DD%A4%CE%C3%A3%BF%CD%20%BF%B7%E3%FE%C2%CE%A1%CA%A5%A2%A5%B8%A5%A2%C8%C7%A1%CB%A4%CE%BC%FD%CF%BF%B6%CA')
    raw.then((resp)=>{
        write(' [OK]\n')
        parse(resp.data)
    })
}

const parse = (raw) => {
    write('> Load HTML...')
    $ = cheerio.load(raw)
    write(' [OK]\n')
    $('.ie5').each((indx, it)=>{
        if(indx == 0){
            // Total Song Count
            $(it).find('a > span > ins').each((indx, it)=>{
                let cateTitle = $(it).text()
                songData.songCategories.push({
                    title: cateTitle,
                    songs: []
                })
            })
        }
        else if(indx == 1){
            // Song List
            let categoryIterated = -1
            $(it).find('tr').each((indx, it)=>{
                let isHeader = ($(it).find('a.anchor').length) == 1
                if(isHeader){
                    categoryIterated++
                    log(`> Traversing #${categoryIterated}: ${$(it).text()}`)
                }
                else{
                    if(categoryIterated != -1){
                        let childrens = $(it).children()

                        let titleColumn = childrens.eq(2)
                        let levelKanntannColumn = childrens.eq(4)
                        let levelHutsuuColumn = childrens.eq(5)
                        let levelMuzukashiiColumn = childrens.eq(6)
                        let levelOniColumn = childrens.eq(7)
                        let levelUraOniColumn = childrens.eq(8)
    
                        let title = titleColumn.find('strong').text()
                        let captionText = titleColumn.find('span').text()
                        let caption = (captionText.length != 0) ? captionText : null
                        let bpm = childrens.eq(3).text()
                        let level0 = levelKanntannColumn.text().replace("★×","").replace("譜面分岐","*")
                        let level1 = levelHutsuuColumn.text().replace("★×","").replace("譜面分岐","*")
                        let level2 = levelMuzukashiiColumn.text().replace("★×","").replace("譜面分岐","*")
                        let level3 = levelOniColumn.text().replace("★×","").replace("譜面分岐","*")
                        let uraOniText = levelUraOniColumn.text()
                        let isUraOniAvailable = uraOniText != "-"
                        let level4 = isUraOniAvailable ? uraOniText.replace("★×","").replace("譜面分岐","*") : null
    
                        songData.songCategories[categoryIterated].songs.push(
                            {
                                title: title,
                                caption: caption,
                                bpm: bpm,
                                levels: {
                                    kanntann: level0,
                                    hutsuu: level1,
                                    muzukashii: level2,
                                    oni: level3,
                                    uraOni: level4
                                }
                            }
                        )
                    }
                }
            })
        }
        //let row = $(ele).html()
    })
    write('> Build JSON...')
    proceedOutput()
}

const proceedOutput = () => {
    fs.writeFile('./songdata.json', JSON.stringify(songData, null, 4), (err) => {
        if (err) {
            write(' [FAILED]\n')
            log('X Build Failed')
            log(err)
        } else {
            write(' [OK]\n')
            log('> Song data successfully built')
        }
    })
}

const get = (url) => {
    return request(url, 'get')
}

const request = (url, method) => {
    return axios.request({
        url: url,
        method: method,
        responseType: "arraybuffer",
        transformResponse: [
            (data) => {
                return iconv.decode(data, 'EUCJP', 'UTF8').toString()
            }
        ]
    })
}

const write = (msg) => {
    process.stdout.write(msg)
}

const log = (msg) => {
    console.log(msg)
}

init()