const fs = require('fs');

async function getComments() {
    try {
        const url = "https://api.github.com/repos/TakashiSasaki/museum-yama-data/pulls/comments/3263429564";
        const response = await fetch(url, {
            headers: {
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Yama-Museum-Agent"
            }
        });
        const reviews = await response.json();
        console.log("Reviews:");
        console.log(JSON.stringify(reviews, null, 2));
    } catch(err) {
        console.error(err);
    }
}
getComments();
