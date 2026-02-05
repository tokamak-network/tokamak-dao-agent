// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MultiSigWallet {

    /**
     * @notice Event that occurs when the submitTransaction function is executed
     * @param owner     Address where the submitTransaction function was executed
     * @param txIndex   Index generated from submitTransaction function
     * @param to        Execution destination of the submitTransaction function
     * @param value     value of eth used in the submitTransaction function
     * @param data      Data containing the function to be executed in the submitTransaction function
     */
    event SubmitTransaction(
        address indexed owner,
        uint indexed txIndex,
        address indexed to,
        uint value,
        bytes data
    );

    /**
     * @notice Event that occurs when the confirmTransaction function is executed
     * @param owner     Address where the confirmTransaction function was executed
     * @param txIndex   This is the index number confirmed in the confirmTransaction function.
     */
    event ConfirmTransaction(
        address indexed owner, 
        uint indexed txIndex
    );

    /**
     * @notice Event that occurs when the revokeConfirmation function is executed
     * @param owner     Address where the revokeConfirmation function was executed
     * @param txIndex   This is the index number revoked in the revokeConfirmation function.
     */
    event RevokeConfirmation(
        address indexed owner, 
        uint indexed txIndex
    );

    /**
     * @notice Event that occurs when the executeTransaction function is executed
     * @param owner     Address where the executeTransaction function was executed
     * @param txIndex   Address where the executeTransaction function was executed
     * @param success   Returns whether the executeTransaction function succeeded or not.
     */
    event ExecuteTransaction(
        address indexed owner, 
        uint indexed txIndex,
        bool success
    );

    /**
     * @notice Event that occurs when the changeOwner function is executed
     * @param oldOwner     Previous Owner Address where owner is change
     * @param ownerIndex   Index whose owner has change
     * @param newOwner     New Owner Address
     */    
    event ChangeOwner(
        address indexed oldOwner,
        uint indexed ownerIndex, 
        address indexed newOwner
    );

    address[] public owners;
    mapping(address => bool) public isOwner;

    uint public constant numConfirmationsRequired = 2;

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint numConfirmations;
    }

    // mapping from tx index => owner => bool
    mapping(uint => mapping(address => bool)) public isConfirmed;
    Transaction[] public transactions;

    modifier onlyMultiSig() {
        require(msg.sender == address(this), "Only MultiSigContract can execute");
        _;
    }

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner");
        _;
    }

    modifier txExists(uint _txIndex) {
        require(_txIndex < transactions.length, "tx does not exist");
        _;
    }

    modifier notExecuted(uint _txIndex) {
        require(!transactions[_txIndex].executed, "tx already executed");
        _;
    }

    modifier notConfirmed(uint _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "tx already confirmed");
        _;
    }

    modifier isValidOwnerIndex(uint index) {
     require(index < owners.length, "It is not valid owner index");
     _;
    }

    modifier nonZeroAddress(address addr) {
        require(addr != address(0), "zero address");
        _;
    }
    

    constructor(address[] memory _owners) {
        require(_owners.length == 3 && _owners.length >= numConfirmationsRequired, "invalid number of owners");

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "invalid owner");
            require(!isOwner[owner], "owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }
    }

    /// @notice This Contract can receive ETH.
    receive() external payable {}

    /// @notice This is a function that changes the owner.
    /// @param _index    Owner index to change
    /// @param _newOwner New Owner Address
    function changeOwner(
        uint _index,
        address _newOwner
    ) public onlyMultiSig isValidOwnerIndex(_index) nonZeroAddress(_newOwner){
        require(!isOwner[_newOwner], "It is already owner");

        isOwner[owners[_index]] = false;
        isOwner[_newOwner] = true;
        owners[_index] = _newOwner;
        
        emit ChangeOwner(owners[_index], _index, _newOwner);
    }

    /// @notice Submit a transaction to be executed on the Contract
    /// @param _to    Address to execute transaction
    /// @param _value Amount of ether to send _to
    /// @param _data  Transaction data to be executed in _to 
    function submitTransaction(
        address _to,
        uint _value,
        bytes memory _data
    ) public onlyOwner nonZeroAddress(_to) {
        require(_data.length != 0 || _value != 0, "invalid data");
        if(_value > 0) {
            require(address(this).balance > 0, "dont have ETH");
        }
        uint txIndex = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0
            })
        );

        //confirm transaction by submitter
        confirmTransaction(txIndex);

        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
    }

    /// @notice confirm transaction execution on index
    /// @param _txIndex Transaction index to confirm
    function confirmTransaction(
        uint _txIndex
    ) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) notConfirmed(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    /// @notice Execute transaction for index
    /// @param _txIndex Transaction index to execute
    function executeTransaction(
        uint _txIndex
    ) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];
        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "cannot execute tx"
        );

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );

        emit ExecuteTransaction(msg.sender, _txIndex, success);
    }

    
    /// @notice Revoke transaction execution on index
    /// @param _txIndex Transaction index to revoke
    function revokeConfirmation(
        uint _txIndex
    ) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];

        require(isConfirmed[_txIndex][msg.sender], "tx not confirmed");

        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;

        emit RevokeConfirmation(msg.sender, _txIndex);
    }

    /// @notice Function to get owners' addresses
    /// @return owners address
    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    /// @notice Function to get transaction length
    /// @return Return transaction length
    function getTransactionCount() public view returns (uint) {
        return transactions.length;
    }

    /// @notice Function to get transaction information
    /// @param _txIndex Transaction index
    /// @return to Address to execute transaction
    /// @return value Amount of Ether to send in the transaction
    /// @return data to be executed in the transaction
    /// @return executed Whether the transaction was executed
    /// @return numConfirmations Amount of transactions confirmed
    function getTransaction(
        uint _txIndex
    )
        public
        view
        returns (
            address to,
            uint value,
            bytes memory data,
            bool executed,
            uint numConfirmations
        )
    {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations
        );
    }
}