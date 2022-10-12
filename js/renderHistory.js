import { web3, contractInstanse } from "./network.js";
import { account } from "./main.js";
import { getBalance } from "./getBalance.js";

export async function renderHistory() {
	let array = await contractInstanse.methods
		.showTransactions()
		.call({ from: account });

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
			renderHistory();
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
				renderHistory();
			};
		};
		container.append(btn);
	}
}
