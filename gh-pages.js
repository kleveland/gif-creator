var ghpages = require('gh-pages');

ghpages.publish(
    'public', // path to public directory
    {
        branch: 'gh-pages',
        repo: 'https://github.com/kleveland/gif-creator.git', // Update to point to your repository  
        user: {
            name: 'Kacey Cleveland', // update to use your name
            email: 'kaceycleveland.mail@gmail.com' // Update to use your email
        }
    },
    (e) => {
        console.log('Deploy Complete!',e)
    }
)