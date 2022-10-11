import abi from "./abi.js";

const contractAddress = "0x528C068cc8527f3Fe3938299FC28496fe09b407A";

let web3, contractInstanse, account, accountRole;

function network() {
	web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
	contractInstanse = new web3.eth.Contract(abi, contractAddress);
	console.log("Connected successfully!");
}
network();

async function getBalance(account) {
	let balance = await web3.eth.getBalance(account);
	balance = await web3.utils.fromWei(balance, "ether");
	let accountBalanceLab = document.querySelector(".account-balance");
	accountBalanceLab.innerHTML = `Balance: ${balance} eth`;
}

// REGISTRATION
let btnReg = document.querySelector(".regBtn");
btnReg.addEventListener("click", async (e) => {
	e.preventDefault();

	let addressAuthInp = document.querySelector(".authAddress");
	let addressValue = addressAuthInp.value;
	let passwordAuthInp = document.querySelector(".authPassword");
	let passwordValue = web3.utils.soliditySha3({
		type: "string",
		value: passwordAuthInp.value,
	});

	await contractInstanse.methods
		.registration(addressValue, passwordValue)
		.send({ from: addressValue }, function (error, result) {
			console.log("registration error: ", error);
			console.log("result: ", result);
			if (error === null) {
				alert("You have successfully registered!");
			}
		});
});

//LOGIN
let btnLogin = document.querySelector(".login");
btnLogin.addEventListener("click", async (event) => {
	event.preventDefault();
	let addressAuthInp = document.querySelector(".authAddress");
	let addressValue = addressAuthInp.value;
	let passwordAuthInp = document.querySelector(".authPassword");
	let passwordValue = web3.utils.soliditySha3({
		type: "string",
		value: passwordAuthInp.value,
	});

	try {
		let resp = await contractInstanse.methods
			.auth(addressValue, passwordValue)
			.call({ from: addressValue }, function (error, result) {
				console.log("registration error: ", error);
				console.log("result: ", result);
			});
		if (resp == true) {
			let modalAuth = document.querySelector("#modal-auth");
			account = addressValue;
			accountRole = await contractInstanse.methods
				.showRole(account)
				.call({ from: account });
			console.log(accountRole);
			modalAuth.style.display = "none";
			localStorage.setItem(
				"accountinfo",
				JSON.stringify({ account, accountRole })
			);
			passwordAuthInp.value = "";
			main();
		}
	} catch (error) {
		alert(error.name);
	}
});

async function main() {
	let modalAuth = document.querySelector("#modal-auth");
	if (JSON.parse(localStorage.getItem("accountinfo")) != undefined) {
		let accInfo = JSON.parse(localStorage.getItem("accountinfo"));
		account = accInfo.account;
		accountRole = accInfo.accountRole;
	} else {
		modalAuth.style.display = "flex";
	}

	let accountAddressLab = document.querySelector(".account-address");
	accountAddressLab.innerHTML = `Address: ${account}`;

	let accountRoleLab = document.querySelector(".account-role");
	accountRoleLab.innerHTML = `Role: ${accountRole == 1 ? "admin" : "user"}`;

	let createTransferBtn = document.querySelector(".create-transfer");
	createTransferBtn.addEventListener("click", createTransfer);

	let exitBtn = document.querySelector(".exit");
	exitBtn.addEventListener("click", () => {
		console.log(21);
		localStorage.removeItem("accountinfo");
		modalAuth.style.display = "flex";
	});

	let transactionHistory = document.querySelector(".transaction-hist");
	transactionHistory.onclick = async () => {
		renderHistory(await getTransactions());
	};

	if (accountRole == 1) {
		let menu = document.querySelector(".nav-list");

		let categories = document.createElement("li");
		categories.classList.add("nav-elem");
		categories.innerHTML = "Categories";
		menu.append(categories);
		categories.onclick = async () => {
			await renderCategoriesPage();
		};

		let votings = document.createElement("li");
		votings.classList.add("nav-elem");
		votings.innerHTML = "Votings";
		menu.append(votings);
		votings.onclick = async () => {
			await renderVotingsPage();
		};
	}

	getBalance(account);
	renderHistory(await getTransactions());
}
main();

async function createTransfer() {
	let modal = document.querySelector("#modal-create-transfer");
	modal.style.display = "flex";
	modal.onclick = (event) => {
		let isModal = event.target.closest(".modal-auth");
		let isCloseBtn = event.target.closest(".close-modal");
		if (!isModal || isCloseBtn) {
			modal.style.display = "none";
		}
	};
	let transfer = document.querySelector(".transfer");
	let safeTransferBtn = document.querySelector(".safe-transfer");
	let categoriesSelect = document.querySelector("#category");
	let patternsSelect = document.querySelector("#pattern");
	let recieverInp = document.querySelector(".reciever");
	let amountMoneyInp = document.querySelector(".money");
	let codewordInp = document.querySelector(".codeword");
	let safeTransfer = false;
	let currentCategory, currentPattern;
	let categories = await contractInstanse.methods
		.showCategories()
		.call({ from: account });
	let patterns = await contractInstanse.methods
		.showPatterns()
		.call({ from: account });

	categoriesSelect.innerHTML = "<option value=''>Select category</option>";
	for (let elem of categories) {
		let opt = document.createElement("option");
		opt.innerHTML = elem[1];
		opt.value = elem[0];
		categoriesSelect.append(opt);
	}

	categoriesSelect.addEventListener("change", (event) => {
		currentCategory = event.target.value;
		patternsSelect.innerHTML = "<option value=''>...</option>";
		let currentPatternId = -1;
		for (let elem of patterns) {
			currentPatternId++;
			if (elem[0] == currentCategory) {
				let opt = document.createElement("option");
				opt.innerHTML = `${elem[1]}: ${elem[2]} coins`;
				opt.value = currentPatternId;
				patternsSelect.append(opt);
			}
		}
	});

	patternsSelect.addEventListener("change", (event) => {
		currentPattern = patterns[event.target.value];
		amountMoneyInp.value = currentPattern ? currentPattern[2] : "";
	});

	safeTransferBtn.addEventListener("click", () => {
		if (safeTransfer == false) {
			safeTransfer = true;
		} else {
			safeTransfer = false;
		}
	});

	transfer.onclick = async (event) => {
		event.preventDefault();
		let to = recieverInp.value;
		let money = web3.utils.toWei(amountMoneyInp.value, "wei");
		let codeword = await web3.utils.soliditySha3({
			type: "string",
			value: codewordInp.value,
		});
		try {
			await contractInstanse.methods
				.createTransaction(
					to,
					money,
					codeword,
					currentCategory,
					safeTransfer
				)
				.send({ value: money, from: account, gas: "6721975" });
			alert("Transaction succesfully created");
			getBalance(account);
			renderHistory(await getTransactions());
		} catch (err) {
			console.log(err.message);
			getBalance(account);
		}
	};
}

async function getTransactions() {
	let transactions = await contractInstanse.methods
		.showTransactions()
		.call({ from: account });
	return transactions;
}

function renderHistory(array) {
	let main = document.querySelector(".main-content");
	main.innerHTML = `
	<header class="history-header">
                <div class="history-header-content">
                    <p>Type: </p>
                    <select name="type" class="history-type">
                        <option value="all">All</option>
                        <option value="in">Incoming</option>
                        <option value="out">Outgoing</option>
                    </select>
                    <p class="done">Completed<input type="checkbox"></p>                    
                </div>
            </header>
            <div class="content"></div>
	`;
	let div = document.querySelector(".content");
	div.innerHTML = "";
	let ul = document.createElement("ul");
	ul.classList.add("content-list");
	div.append(ul);
	let typeSelector = document.querySelector(".history-type");
	let idElem = 0;
	for (let elem of array) {
		if (elem[0] == account || elem[1] == account) {
			renderHistoryElem(elem, idElem);
		}
		idElem++;
	}

	typeSelector.onchange = (e) => {
		let type = e.target.value;
		let idElem = 0;
		switch (type) {
			case "all":
				ul.innerHTML = "";
				for (let elem of array) {
					if (elem[0] == account || elem[1] == account) {
						renderHistoryElem(elem, idElem);
					}
					idElem++;
				}
				break;
			case "in":
				ul.innerHTML = "";
				for (let elem of array) {
					if (elem[1] == account) {
						renderHistoryElem(elem, idElem);
					}
					idElem++;
				}
				break;
			case "out":
				ul.innerHTML = "";
				for (let elem of array) {
					if (elem[0] == account) {
						renderHistoryElem(elem, idElem);
					}
					idElem++;
				}
				break;
		}
	};
}

async function renderHistoryElem(elem, idElem) {
	let categories = await contractInstanse.methods
		.showCategories()
		.call({ from: account });
	let ul = document.querySelector(".content-list");
	let li = document.createElement("li");
	li.classList.add("content-elem");
	li.innerHTML = `
	<div class="content-inner">
		<p>From: ${elem[0]}</p>
		<p>To: ${elem[1]}</p>
		<p>${elem[2]}</p>
		<p>Attempts left: ${elem[4]}</p>
		<p>Category: ${categories[elem[5]][1]}</p>
		${statusRender(elem)}
		${safeTransferRender(elem)}
		<p>Created: ${convertToDate(elem[9])}</p>
		${recieveAtRender(elem)}
	</div>
	`;
	ul.append(li);
	checkTransactionSender(elem, idElem, li); // добавление кнопок claim || cancel
}

function statusRender(elem) {
	if (elem[8] == 0) {
		return "<p>Status: Not done yet</p>";
	} else if (elem[8] == 1) {
		return "<p>Status: Done</p>";
	} else if (elem[8] == 2) {
		return "<p>Status: Canceled</p>";
	} else if (elem[8] == 3) {
		return "<p>Status: Code word entered incorrectly</p>";
	}
}

function safeTransferRender(elem) {
	if (elem[6] == true) {
		return `<p>Safe transfer</p>
		<p>Confirmed: ${elem[7]}</p>`;
	}
	return "";
}

function recieveAtRender(elem) {
	if (elem[10] != 0) {
		return `<p>Recieved at: ${convertToDate(elem[10])}</p>`;
	}
	return "";
}

function convertToDate(timestamp) {
	const result = new Date(timestamp * 1000);

	return `${
		String(result.getDate()).length < 2
			? "0" + result.getDate()
			: result.getDate()
	}.${
		String(result.getMonth() + 1).length < 2
			? "0" + result.getMonth() + 1
			: result.getMonth() + 1
	}.${result.getFullYear()} ${
		String(result.getHours()).length < 2
			? "0" + result.getHours()
			: result.getHours()
	}:${
		String(result.getMinutes()).length < 2
			? "0" + result.getMinutes()
			: result.getMinutes()
	}`;
}

function checkTransactionSender(elem, id, container) {
	let my = elem[0] == account ? true : false;
	let status = elem[8];

	if ((my && status == 0) || status == 4) {
		let btn = document.createElement("button");
		btn.classList.add("cancel-transaction");
		btn.innerHTML = "Cancel";
		btn.id = id;
		btn.onclick = async () => {
			console.log(btn.id);
			await contractInstanse.methods
				.cancelTransaction(btn.id)
				.send({ from: account });

			getBalance(account);
			renderHistory(await getTransactions());
		};
		container.append(btn);
	} else if (!my && status == 0) {
		let btn = document.createElement("button");
		btn.classList.add("claim-transaction");
		btn.innerHTML = "Claim";
		btn.id = id;

		btn.onclick = async () => {
			let modal = document.querySelector("#modal-codeword");
			modal.onclick = (event) => {
				let isModal = event.target.closest(".modal-auth");
				let isCloseBtn = event.target.closest(".close-modal");
				if (!isModal || isCloseBtn) {
					modal.style.display = "none";
				}
			};
			let attempts = modal.querySelector(".attempts");
			let inp = modal.querySelector(".codewordInp");
			attempts.innerHTML = `Attempts left: ${elem[4]}`;
			modal.style.display = "flex";

			let enterCodeword = modal.querySelector(".enter-codeword");
			enterCodeword.onclick = async (event) => {
				event.preventDefault();
				let codeword = await web3.utils.soliditySha3({
					type: "string",
					value: inp.value,
				});
				inp.value = "";
				await contractInstanse.methods
					.receiveTransaction(btn.id, codeword)
					.send({ from: account, gas: "6721975" });
				let resp = await contractInstanse.methods
					.transferResponseShow()
					.call({ from: account });
				console.log(resp);
				let check = await contractInstanse.methods
					.checkAttempts(btn.id)
					.call({ from: account });
				if (resp == 1) {
					alert("Transfer completed");
					modal.style.display = "none";
				}
				if (resp == 2) {
					alert("Incorrect");
					attempts.innerHTML = `Attempts left: ${check}`;
				}
				if (resp == 3) {
					alert("Attempts are over!");
					modal.style.display = "none";
				}
				renderHistory(await getTransactions());
			};
		};
		container.append(btn);
	}
}

async function renderCategoriesPage() {
	let main = document.querySelector(".main-content");
	main.innerHTML = "";

	let addCategory = document.createElement("button");
	addCategory.innerHTML = "Create new category";
	addCategory.classList.add("create-category");
	main.append(addCategory);
	addCategory.onclick = () => {
		let modal = document.querySelector("#modal-category");
		modal.style.display = "flex";

		modal.onclick = (event) => {
			let isModal = event.target.closest(".modal-auth");
			let isCloseBtn = event.target.closest(".close-modal");
			if (!isModal || isCloseBtn) {
				modal.style.display = "none";
			}
		}

		let addBtn = modal.querySelector(".add-category");
		addBtn.onclick = async (event) => {
			event.preventDefault();
			let nameInp = modal.querySelector(".name-category");
			let name = nameInp.value;
			let resp = await contractInstanse.methods.addCategory(name).send({from: account});
			console.log(resp)
			alert("Category successfully created");
			nameInp.value = "";
			renderCategoriesPage();
		}
	}

	let div = document.createElement("div");
	div.classList.add("content");
	main.append(div);

	let ul = document.createElement("ul");
	ul.classList.add("content-list");
	div.append(ul);

	let categories = await contractInstanse.methods
		.showCategories()
		.call({ from: account });
	let patterns = await contractInstanse.methods
		.showPatterns()
		.call({ from: account });

	for (let category of categories) {
		let li = document.createElement("li");
		li.classList.add("content-elem");
		ul.append(li);

		let liHeader = document.createElement("header");
		liHeader.classList.add("li-header");
		liHeader.innerHTML = `<p>${category[1]}</p>`;

		li.append(liHeader);

		let addPattern = document.createElement("button");
		addPattern.innerHTML = "Add";
		addPattern.classList.add("add-pattern");
		liHeader.append(addPattern);
		addPattern.onclick = () => {
			let modal = document.querySelector("#modal-pattern");
			modal.style.display = "flex";
			let categoryName = document.querySelector(".category-name");
			categoryName.innerHTML = category[1];

			modal.onclick = (event) => {
				let isModal = event.target.closest(".modal-auth");
				let isCloseBtn = event.target.closest(".close-modal");
				if (!isModal || isCloseBtn) {
					modal.style.display = "none";
				}
			} 

			let addBtn = modal.querySelector(".add-pattern");
			addBtn.onclick = async (event) => {
				event.preventDefault();
				let nameInp = modal.querySelector(".name-pattern");
				name = nameInp.value;
				let valueInp = modal.querySelector(".value-pattern")
				let value = valueInp.value;

				await contractInstanse.methods.addPattern(category[0], name, value).send({from:account, gas: "6721975"});
				alert("Pattern successfully created");
				nameInp.value = "";
				valueInp.value = "";

				renderCategoriesPage();
			}
		}

		let imgArrow = document.createElement("img");
		imgArrow.classList.add("open-patterns");
		imgArrow.src = "./assets/arrow.svg";
		liHeader.prepend(imgArrow);

		let categoryPatternsUl = document.createElement("ul");
		categoryPatternsUl.classList.add("patterns-list");
		categoryPatternsUl.classList.add("hide");
		li.append(categoryPatternsUl);

		liHeader.onclick = (event) => {
			let isBtn = event.target.closest(".add-pattern");
			if (!isBtn){
				imgArrow.classList.toggle("rotate");
				categoryPatternsUl.classList.toggle("hide");				
			}
		};

		for (let pattern of patterns) {
			if (pattern[0] == category[0]) {
				let liPattern = document.createElement("li");
				liPattern.classList.add("pattern-elem");
				liPattern.innerHTML = pattern[1] + ": " + pattern[2] + " coins";
				categoryPatternsUl.append(liPattern);
			}
		}
	}
}

async function renderVotingsPage() {
	let main = document.querySelector(".main-content");
	main.innerHTML = "";

	let div = document.createElement("div");
	div.classList.add("content");
	main.append(div);
}
