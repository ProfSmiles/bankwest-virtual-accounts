class VirtualAccount {
    constructor(name, value, goal, notes, real_id) {
        this.name = name;
        this.value = parseFloat(value);
        this.goal = parseFloat(goal);
        this.notes = notes;
        this.real_id = real_id;
    }
    
    save() {
        return {
            "name": this.name,
            "value": this.value,
            "goal": this.goal,
            "notes": this.notes,
            "real_id": this.real_id
        };
    }
    
    static load(data) {
        return new VirtualAccount(
            data['name'],
            parseFloat(data['value']),
            parseFloat(data['goal']),
            data['notes'],
            data['real_id']
        );
    }
    
    edit(name, value, goal, notes, real_id) {
        this.name = name;
        this.value = parseFloat(value);
        this.goal = parseFloat(goal);
        this.notes = notes;
        this.real_id = real_id;
    }
    
    updateValue(value) {
        this.value = parseFloat(value);
    }
}

var formatter = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
});
function formatCur(value) {
    var f = formatter.format(value);
    if (f.endsWith('.00')) {
        f = f.substring(0, f.length-3);
    }
    return f;
}

var visible = 'table';
function switchView(e) {
    if (visible === 'table') {
        $('div.va_accounts_table').addClass('va_hidden');
        $('div.va_edit_account').removeClass('va_hidden');
        visible = 'edit';
    }
    else {
        $('div.va_accounts_table').removeClass('va_hidden');
        $('div.va_edit_account').addClass('va_hidden');
        visible = 'table';
    }
}

function checkError() {
    var e = chrome.runtime.lastError;
    if (e !== null) {
        console.log(e);
    }
}

function checkStorage() {
    // chrome.storage.sync.set({"accounts": []}, checkError);
    chrome.storage.sync.get({"accounts": null}, function(result) {
        if (result['accounts'] === null) {
            chrome.storage.sync.set({"accounts": []}, checkError);
        }
    });
}

var cached_accounts = [];

function loadAccounts() {
    var old = cached_accounts;
    chrome.storage.sync.get("accounts", function(result) {
        var all_accounts = result['accounts'];
        var converted = [];
        for (var i=0; i<all_accounts.length; i++) {
            converted[converted.length] = VirtualAccount.load(all_accounts[i]);
        }
        cached_accounts = converted;
        if (old !== converted && visible === 'table') {
            reloadUI();
        }
    });
}

function saveAccounts(accounts) {
    var converted = [];
    for (var i=0; i<accounts.length; i++) {
        converted[converted.length] = accounts[i].save();
    }
    chrome.storage.sync.set({"accounts": converted}, checkError);
    loadAccounts();
}

function updateBalances() {
    var i; var a;
    var accounts = {};
    var account_list = $(
        'div#contentColumn table#_ctl0_ContentMain_grdBalances td.value[nowrap="nowrap"] span[id$="Rdelabel1"]');
    for (i=0; i<account_list.length; i++) {
        accounts[account_list[i].id] = {
            'element': account_list[i],
            'balance': parseFloat(account_list[i].textContent.substring(1).replace(',', ''))
        };
    }
    
    for (i=0; i<cached_accounts.length; i++) {
        a = cached_accounts[i];
        accounts[a.real_id].balance -= a.value;
    }
    
    var parent; var f_bal;
    for (i=0; i<account_list.length; i++) {
        parent = $(account_list[i].parentElement);
        f_bal = '('+formatCur(accounts[account_list[i].id].balance)+')';
        if (parent.find('.va_real_balance').length) {
            parent.find('.va_real_balance').text(f_bal);
            parent.find('.va_real_balance').removeClass('va_negative');
        }
        else {
            parent.append(
                '<span class="va_real_balance">'+f_bal+'</span>'
            );
        }
        if (accounts[account_list[i].id].balance < 0) {
            parent.find('.va_real_balance').addClass('va_negative');
        }
    }
}

function saveForm() {
    var id = $('input#va_edit_id').val();
    var name = $('input#va_edit_account_name').val();
    var balance = $('input#va_edit_account_balance').val();
    var goal = $('input#va_edit_account_goal').val();
    var notes = $('input#va_edit_account_notes').val();
    var real = $('select#va_edit_account_real').val();
    
    var all_accounts = cached_accounts;
    if (id === '') {
        all_accounts[all_accounts.length] = new VirtualAccount(
            name, balance, goal, notes, real);
    }
    else {
        all_accounts[id].edit(name, balance, goal, notes, real)
    }
    
    saveAccounts(all_accounts);
    reloadUI();
}

function editForm(e) {
    var id = e.target.getAttribute('dataid');
    if (visible === 'table') {
        switchView(e);
    }
    var va = cached_accounts[id];
    
    $('input#va_edit_id').val(id);
    $('input#va_edit_account_name').val(va.name);
    $('input#va_edit_account_balance').val(va.value);
    $('input#va_edit_account_goal').val(va.goal);
    $('input#va_edit_account_notes').val(va.notes);
    $('select#va_edit_account_real').val(va.real_id);
    
    $('div.va_edit_account').append(
'<div class="input_row">\
    <button id="va_edit_account_delete">Delete</button>\
</div>'
    )
    
    $('button#va_edit_account_delete').click(function(e) {
        var edit_accounts = cached_accounts;
        edit_accounts.splice(id, 1);
        saveAccounts(edit_accounts);
        reloadUI();
    });
}

function reloadUI() {
    visible = 'table';
    if (!$('div#va_content_column').length) {
        $('div#contentColumn').after('<div id="va_content_column"></div>');
    }
    $('div#va_content_column').html(
'<div class="va_accounts_list">\
    <div class="va_accounts_table">\
        <div class="va_accounts_row header">\
            <div class="va_accounts_heading">Name</div>\
            <div class="va_accounts_heading">Balance</div>\
            <div class="va_accounts_heading">Goal</div>\
            <div class="va_accounts_heading">Notes</div>\
            <div class="va_accounts_heading">&nbsp;</div>\
        </div>\
        <div class="va_accounts_row new_row">\
            <div class="va_accounts_cell"></div>\
            <div class="va_accounts_cell"></div>\
            <div class="va_accounts_cell"></div>\
            <div class="va_accounts_cell new_label">New</div>\
            <div class="va_accounts_cell new_account">\
                <span class="button new_account" title="New account">&nbsp;</span>\
            </div>\
        </div>\
    </div>\
</div>\
<div class="va_edit_account va_hidden">\
    <input type="hidden" id="va_edit_id" value=""/>\
    <div class="input_row">\
        <label>Source account</label>\
        <select id="va_edit_account_real"></select>\
    </div>\
    <div class="input_row">\
        <label>Name</label>\
        <input type="text" id="va_edit_account_name"/>\
    </div>\
    <div class="input_row">\
        <label>Balance</label>\
        <span class="currency">\
            <span class="symbol">$</span>\
            <input type="number" id="va_edit_account_balance" value="0"/>\
        </span>\
    </div>\
    <div class="input_row">\
        <label>Goal</label>\
        <span class="currency">\
            <span class="symbol">$</span>\
            <input type="number" id="va_edit_account_goal"/>\
        </span>\
    </div>\
    <div class="input_row">\
        <label>Notes (eg., due date, description, etc.)</label>\
        <input type="text" id="va_edit_account_notes"/>\
    </div>\
    <div class="input_row">\
        <button id="va_edit_account_save">Save</button>\
        <button id="va_edit_account_cancel">Cancel</button>\
    </div>\
</div>'
    );
    
    var a; var i;
    for (i=0; i<cached_accounts.length; i++) {
        a = cached_accounts[i];
        $('div.va_accounts_table div.va_accounts_row.new_row').before(
'<div class="va_accounts_row">\
    <div class="va_accounts_cell">'+a['name']+'</div>\
    <div class="va_accounts_cell">'+formatCur(a['value'])+'</div>\
    <div class="va_accounts_cell">'+formatCur(a['goal'])+'</div>\
    <div class="va_accounts_cell">'+a['notes']+'</div>\
    <div class="va_accounts_cell new_account">\
        <span class="button edit_account" dataid="'+i+'" title="Edit account">&nbsp;</span>\
    </div>\
</div>\
'
        );
    }
    
    var real_accounts = $(
        'div#contentColumn table#_ctl0_ContentMain_grdBalances td.value[nowrap="nowrap"] span[id$="Rdelabel1"]');
    for (i=0; i<real_accounts.length; i++) {
        a = real_accounts[i];
        $('div.va_edit_account select#va_edit_account_real').append(
'<option value="'+a.id+'">\
'+$($(a.parentElement).siblings()[0]).text()+'</option>'
        );
    }
    
    $('span.button.new_account').click(switchView);
    $('span.button.edit_account').click(editForm);
    $('button#va_edit_account_save').click(saveForm);
    $('button#va_edit_account_cancel').click(reloadUI);
    
    updateBalances();
}

$(document).ready(function() {
    checkStorage();
    loadAccounts();
    reloadUI();
});