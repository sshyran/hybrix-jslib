const valid = require('./valid.js');

const TESTS_PER_ASSET = 12;

const renderSymbol = (renderCell, symbol, data, messages, newMessages) => {

  const results = [];
  for(let testId in data){
    const x = data[testId];
    const valid = x.valid;
    const known = x.known;
    const result = x.result;
    const validationMessages = data.messages;

    const testResult = renderCell(symbol, testId, valid, known, result, messages, newMessages);
    results.push(testResult);
  }
  return results;
};

const renderCellCLI = (symbol,testId, valid, known, result, messages,newMessages) => {
  if(known){
    if(valid){
      if(known.link){
        messages.push('\033[36m'+symbol+ ' '+testId+'\033[0m : '+known.message);
      }else{
        messages.push('\033[36m'+symbol+ ' '+testId+'\033[0m : '+known.message+ ' \033[31m [Create issue]\033[0m');
      }
      return '\033[36m OK \033[0m';
    }else{
      if(known.link){
        messages.push('\033[33m'+symbol+ ' '+testId+'\033[0m : '+known.message);
      }else{
        messages.push('\033[33m'+symbol+ ' '+testId+'\033[0m : '+known.message+ ' \033[31m [Create issue]\033[0m');
      }
      return '\033[33mWARN\033[0m';
    }
  } else if (valid) {
    return '\033[32m OK \033[0m';
  } else {
    let title;

    if (typeof data === 'object') {
      title = JSON.stringify(result);
    } else {
      title = String(result);
    }
    title = title.replace(/"/g, '');
    newMessages.push('\033[31m'+symbol+ ' '+testId+'\033[0m : returned '+title+' \033[31m [Create issue]\033[0m');
    return '\033[31mFAIL\033[0m';
  }
};

function issueLink(symbol,type,issue){
  return `https://gitlab.com/hybrix/hybrixd/node/issues/new?issue[description]=${encodeURIComponent('/label ~"\\* Development Team \\*"\n/milestone %"Coin support : Test Issues"\n')}&issue[title]=${encodeURIComponent(symbol+ ' '+type+' '+(issue?issue.message:''))} `
}

const renderCellWeb = (symbol,type,valid,known, data, messages, newMessages) => {
  let title;
  if (typeof data === 'object') {
    title = JSON.stringify(data);
  } else {
    title = String(data);
  }
  title = title.replace(/"/g, '');
  if(known){
    if(valid){

      if(known.link){
        messages.push('<b style="color:purple;">'+symbol+ ' '+type+'</b> : <a  name="'+symbol+'_'+type+'" target="_blank" href="'+known.link+'">'+known.message+'</a>');
      }else{
        messages.push('<b style="color:purple;">'+symbol+ ' '+type+'</b> : <a name="'+symbol+'_'+type+'">'+known.message+' </a><a style="color:red;"target="_blank" href="'+issueLink(symbol,type,known)+'"><b>Create issue</b></a>');
      }


      return '<td style="text-align:center;background-color:purple" title="' + title + '"><a style="text-decoration:none; width: 100%;height: 100%;display: block;" href="#'+symbol+'_'+type+'">&nbsp;</a></td>';

    }else{
      if(known.link){
        messages.push('<b style="color:orange;">'+symbol+ ' '+type+'</b> : <a  name="'+symbol+'_'+type+'" target="_blank" href="'+known.link+'">'+known.message+'</a>');
      }else{
        messages.push('<b style="color:orange;">'+symbol+ ' '+type+'</b> : <a name="'+symbol+'_'+type+'">'+known.message+' </a><a style="color:red;"target="_blank" href="'+issueLink(symbol,type,known)+'"><b>Create issue</b></a>');
      }
      return '<td style="text-align:center;background-color:orange" title="' + title + '"><a style="text-decoration:none; width: 100%;height: 100%;display: block;" href="#'+symbol+'_'+type+'">&nbsp;</a></td>';
    }
  } else if (valid) {
    return '<td style="text-align:center;background-color:green" title="' + title + '">&nbsp;</td>';
  } else {

    newMessages.push('<b style="color:red;">'+symbol+ ' '+type+'</b> : returned '+title+' <a  name="'+symbol+'_'+type+'" style="color:red;"target="_blank" href="'+issueLink(symbol,type)+'"><b>Create issue</b></a>');

    return '<td style="text-align:center;background-color:red"  title="' + title + '"><a style="text-decoration:none; width: 100%;height: 100%;display: block;" href="#'+symbol+'_'+type+'">&nbsp;</a></td>';
  }
};

const renderCellXML = (symbol,testId, valid, known, result, messages,newMessages) => {
  let title;
  if (typeof result === 'object') {
    title = JSON.stringify(result);
  } else {
    title = String(result);
  }
  title = title.replace(/"/g, '\\"');

  let r =  `<testcase id="${symbol+'_'+testId}" name="${symbol+' '+testId}" time="0.001">`
  if (!valid) {
    r+=`<failure message="${title}" type="ERROR"></failure>`
  }
  r+=`</testcase>`
  return r;
};

const renderTableXML = data => {

  const messages = [];
  const newMessages = [];

  let r='';
  for (let symbol in data.assets) {
      r = renderSymbol(renderCellXML, symbol, data.assets[symbol],messages,newMessages).join('');
  }
  r='<?xml version="1.0" encoding="UTF-8" ?><testsuites id="hybrix" name="hybrix" tests="'+data.total+'" failures="'+(data.failures)+'" time="0.001"><testsuite id="testsuite.hybrix" name="hybrix" tests="'+data.total+'" failures="'+(data.failures)+'" time="0.001">'+r;
  r+='</testsuite></testsuites>';
  return r;
}

const renderTableJSON = data => {
  return JSON.stringify(data);
}

const renderTableCLI = data => {

  const messages = [];
  const newMessages = [];
  let r = '\n';
  r += '   #   SAMPLE                                    GENERATED                    ' + '\n';
  r += '      ┌────┬──────┬─────┬────┬──────┬──────┬────┬────┬────┬──────┬──────┬────┬────┐' + '\n';
  r += '      │Test│Detail│Sampl│Vald│Balnce│Unspnt│Hist│Tran│Vald│Balnce│Unspnt│Sign│Hash│' + '\n';
  for (let symbol in data.assets) {
    r += '      ├────┼──────┼─────┼────┼──────┼──────┼────┼────┼────┼──────┼──────┼────┼────┤' + '\n';
    r += symbol.substr(0, 5) + '     '.substr(0, 5 - symbol.length) + ' │';

    const results = renderSymbol(renderCellCLI, symbol, data.assets[symbol],messages,newMessages);
    //
    r +=    results[0] + '│';
    r += ' ' + results[1] + ' │';
    r +=       results[2] + ' │';
    r +=       results[3] + '│';
    r += ' ' + results[4] + ' │';
    r += ' ' + results[5] + ' │';
    r +=       results[6] + '│';
    r +=       results[7] + '│';
    r +=       results[8] + '│';
    r += ' ' + results[9] + ' │';
    r += ' ' + results[10] + ' │';
    r +=       results[11] + '│';
    r +=       results[12]+'│';
    r += '\n';
  }
  r += '      └────┴──────┴─────┴────┴──────┴──────┴────┴────┴────┴──────┴──────┴────┴────┘' + '\n';
  r += '\n';
  r += 'New Issues:\n';
  newMessages.sort();
  for (let i =0;i<newMessages.length;++i) {
    r+= ' - '+newMessages[i]+'\n';
  }
  r += '\n';
  r += 'Known Issues:\n';
  messages.sort();
  for (let i =0;i<messages.length;++i) {
    r+= ' - '+messages[i]+'\n';
  }
  r += '\n';
  r += '      SUCCESS RATE: ' + Math.floor((((data.total-data.failures) / data.total) || 0) * 100) + '%' + '\n';
  return r;
}

const renderTableWeb = data => {

  const messages = [];
  const newMessages = [];
  let r = `
<style>
:target {
 background-color: yellow;
}
</style>
<table><tr><td>Symbol</td><td colspan="2"></td><td colspan="7" style="text-align:center;">Sample</td><td colspan="5"  style="text-align:center;">Generated</td></tr>`;
  r += '<tr><td></td><td>Test</td><td>Details</td><td>Sample</td><td>Valid</td><td>Balance</td><td>Unspent</td>';
  r+='<td>History</td>';
  r+='<td>Transaction</td>';
  r += '<td>Valid</td><td>Balance</td><td>Unspent</td>';
  // r+='<td>History</td>'
  r += '<td>Sign</td><td>Hash</td></tr>';
  for (let symbol in data.assets) {
    r += '<tr>';
    r += '<td>' + symbol + '</td>';
    r += renderSymbol(renderCellWeb, symbol, data.assets[symbol],messages,newMessages).join('');
    r += '</tr>';
  }
  r += '</table>';
  r += '<h3>New Issues</h3>';
  r += '<ul>';
  newMessages.sort();
  for (let i =0;i<newMessages.length;++i) {
    r += '<li>'+newMessages[i]+'</li>';
  }
  r += '</ul>';
  r += '<h3><a href="https://gitlab.com/groups/hybrix/-/issues?milestone_title=Coin+support+%3A+Test+Issues" target="_blank">Known Issues</a></h3>';
  r += '<ul>';
  messages.sort();
  for (let i =0;i<messages.length;++i) {
    r += '<li>'+messages[i]+'</li>';
  }
  r += '</ul>';


  r += '<h1>' + ((data.total-data.failures) / data.total * 100) + '%</h1>';
  return r;
};

exports.xml = renderTableXML;
exports.json = renderTableJSON;
exports.cli = renderTableCLI;
exports.web = renderTableWeb;
