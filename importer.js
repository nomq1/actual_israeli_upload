// import { CompanyTypes, createScraper } from 'israeli-bank-scrapers';
const { CompanyTypes, createScraper } = require('israeli-bank-scrapers');
const api = require('@actual-app/api');
//|||||||||||||||actualbudget stuff||||||||||||||||||||||
// site URL
const url = '';
// Budget data will be cached locally here, in subdirectories for each file.
const dataDir = './data';
// This is the password you use to log into the server
const password = '';
  // This is the ID from Settings → Show advanced settings → Sync ID
const syncID = '';
//if you have end-to-end encryption enabled
const syncPass = null
const days_to_import=1826;
// |||||||||||||Bank scrapers stuff|||||||||||||||||||||
// bank credentials 
const Bank_hapoalim_credentials = {
    userCode: '',
    password: ''
  };
const isracard_credentials = {
    id: '',
    card6Digits: '',
    password: ''
  };
const visacal_credentials =
{
    username: "",
    password: ''
};

// variables 
let startdate = new Date();
startdate.setDate(startdate.getDate() - days_to_import);



function extact_transactions (scrapeResult)
{
    if (scrapeResult.success === false)
    {
        console.error(scrapeResult.errorType);
        console.error(scrapeResult.errorMessage);
        throw new Error(scrapeResult.errorMessage);
    }
    let transactions = [];
    if (scrapeResult.accounts!== undefined)
        scrapeResult?.accounts.forEach(account => {
            transactions = transactions.concat(account['txns']);
        });
    else
        transactions = transactions.concat(scrapeResult['txns']);
    return transactions;
}
function convert_transactions_to_actual (txns)
{
    return txns.map(row => ({"date":row['date'].split('T')[0] , "payee_name":row['description'] , "amount":Math.round(row['chargedAmount']*100),"notes":row['memo'] , "cleared":row["status"] === 'completed' ,"imported_id":row?.identifier}));
}

// bank stuff 
(async () => {
// scrape data from bank 
let options = {
    companyId: CompanyTypes.hapoalim, 
    startDate: startdate,
    combineInstallments: false,
    showBrowser: true 
  };
let scraper = createScraper(options)
let scrapeResult = await scraper.scrape(Bank_hapoalim_credentials);
scrapeResult = extact_transactions(scrapeResult);
// scrape from isracard
options.companyId = CompanyTypes.isracard;
scraper = createScraper(options);
scrapeResult = scrapeResult.concat(extact_transactions(await scraper.scrape(isracard_credentials)));
//scrape from visacal
options.companyId = CompanyTypes.visaCal;
scraper = createScraper(options);
scrapeResult = scrapeResult.concat(extact_transactions(await scraper.scrape(visacal_credentials)));


const actual_transactions = convert_transactions_to_actual(scrapeResult);


///Connect to actual 

  await api.init({
    // Budget data will be cached locally here, in subdirectories for each file.
    dataDir: dataDir,
    // This is the URL of your running server
    serverURL: url,
    // This is the password you use to log into the server
    password: password,
  });

  // This is the ID from Settings → Show advanced settings → Sync ID
  if (syncPass !== null)//if you have end-to-end encryption enabled
  {
    await api.downloadBudget(syncID, {
            password: syncPass,
        });
  }
  else
  {
    await api.downloadBudget(syncID);
  }

  /// importing data 


  let accounts = await api.getAccounts();

  await api.importTransactions(accounts[0].id, actual_transactions);


  await api.shutdown();
})();