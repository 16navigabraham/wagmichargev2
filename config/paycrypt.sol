// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Paycrypt
 * @dev ERC20-based decentralized payment system
 * @author Paycrypt Team
 */
contract Paycrypt is 
    Ownable,
    ReentrancyGuard,
    Pausable 
{
    using SafeERC20 for IERC20;

    // Custom Errors (Shortened for gas optimization)
    error InsufficientAllowance();
    error UnsupportedToken();
    error BlacklistedUser();
    error TransferFailed();
    error OrderNotFound();
    error OrderAlreadyProcessed();
    error ExceedsOrderLimit();
    error InsufficientBalance();
    error ZeroAddress();
    error ZeroAmount();
    error InvalidOrderId();
    error NotAuthorized();
    error TokenAlreadySupported();

    // Enums
    enum OrderStatus { Pending, Successful, Failed }

    // Structs (Optimized packing)
    struct Order {
        uint256 orderId;
        bytes32 requestId;
        address user;
        address tokenAddress;
        uint256 amount;
        uint256 timestamp;
        uint256 processedTimestamp;
        OrderStatus status;
    }

    struct SupportedToken {
        address tokenAddress;
        uint256 orderLimit;
        uint256 totalVolume;
        uint256 successfulOrders;
        uint256 failedOrders;
        string name;
        uint8 decimals;
        bool isActive;
    }

    // Combined mapping for gas optimization
    struct UserData {
        uint256[] orders;
        bool isBlacklisted;
        bool isAdmin;
    }

    // State Variables
    mapping(uint256 => Order) private _orders;
    mapping(address => UserData) private _userData;
    mapping(address => SupportedToken) private _supportedTokens;
    
    address[] private _tokenList;
    address private _devWallet;
    uint256 private _orderCounter;
    uint256 private _totalVolume;
    uint256 private _totalSuccessfulOrders;
    uint256 private _totalFailedOrders;

    // Events
    event OrderCreated(
        uint256 indexed orderId,
        bytes32 indexed requestId,
        address indexed user,
        address tokenAddress,
        uint256 amount
    );
    
    event OrderSuccessful(
        uint256 indexed orderId,
        address indexed user,
        address tokenAddress,
        uint256 amount
    );
    
    event OrderFailed(
        uint256 indexed orderId,
        address indexed user,
        address tokenAddress,
        uint256 amount
    );
    
    event TokenAdded(address indexed tokenAddress, string name, uint8 decimals);
    event TokenStatusUpdated(address indexed tokenAddress, bool status);
    event OrderLimitUpdated(address indexed tokenAddress, uint256 newLimit);
    event DevWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event UserBlacklisted(address indexed user);
    event UserRemovedFromBlacklist(address indexed user);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event EmergencyWithdraw(address indexed token, uint256 amount);

    // Modifiers
    modifier onlyAdmin() {
        require(_userData[msg.sender].isAdmin || msg.sender == owner(), "Not authorized");
        _;
    }

    modifier notBlacklisted(address user) {
        require(!_userData[user].isBlacklisted, "User blacklisted");
        _;
    }

    modifier validAddress(address addr) {
        require(addr != address(0), "Zero address");
        _;
    }

    modifier validAmount(uint256 amount) {
        require(amount > 0, "Zero amount");
        _;
    }

    modifier tokenSupported(address tokenAddress) {
        require(_supportedTokens[tokenAddress].isActive, "Token not supported");
        _;
    }

    modifier orderExists(uint256 orderId) {
        require(orderId > 0 && orderId <= _orderCounter, "Order not found");
        _;
    }

    modifier orderPending(uint256 orderId) {
        require(_orders[orderId].status == OrderStatus.Pending, "Order processed");
        _;
    }

    /**
     * @dev Constructor
     */
    constructor(
        address devWallet_,
        address initialOwner_
    ) Ownable(initialOwner_) {
        require(devWallet_ != address(0), "Dev wallet zero");
        require(initialOwner_ != address(0), "Owner zero");

        _devWallet = devWallet_;
        
        // Add owner as admin
        _userData[initialOwner_].isAdmin = true;
        emit AdminAdded(initialOwner_);
    }

    // Write Functions

    /**
     * @dev Create a new order
     */
    function createOrder(
        bytes32 requestId,
        address tokenAddress,
        uint256 amount
    ) 
        external 
        nonReentrant
        whenNotPaused
        notBlacklisted(msg.sender)
        validAddress(tokenAddress)
        validAmount(amount)
        tokenSupported(tokenAddress)
    {
        SupportedToken memory token = _supportedTokens[tokenAddress];
        
        require(amount <= token.orderLimit, "Exceeds limit");

        uint256 userBalance = IERC20(tokenAddress).balanceOf(msg.sender);
        require(userBalance >= amount, "Insufficient balance");

        uint256 allowance = IERC20(tokenAddress).allowance(msg.sender, address(this));
        require(allowance >= amount, "Insufficient allowance");

        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), amount);
        
        _orderCounter = _orderCounter + 1;
        
        Order storage newOrder = _orders[_orderCounter];
        newOrder.orderId = _orderCounter;
        newOrder.requestId = requestId;
        newOrder.user = msg.sender;
        newOrder.tokenAddress = tokenAddress;
        newOrder.amount = amount;
        newOrder.status = OrderStatus.Pending;
        newOrder.timestamp = block.timestamp;
        newOrder.processedTimestamp = 0;

        _userData[msg.sender].orders.push(_orderCounter);

        emit OrderCreated(_orderCounter, requestId, msg.sender, tokenAddress, amount);
    }

    /**
     * @dev Mark order as successful
     */
    function markOrderSuccessful(uint256 orderId) 
        external 
        nonReentrant
        onlyAdmin 
        orderExists(orderId) 
        orderPending(orderId) 
    {
        Order storage order = _orders[orderId];
        SupportedToken storage token = _supportedTokens[order.tokenAddress];

        order.status = OrderStatus.Successful;
        order.processedTimestamp = block.timestamp;

        token.totalVolume = token.totalVolume + order.amount;
        token.successfulOrders = token.successfulOrders + 1;
        _totalVolume = _totalVolume + order.amount;
        _totalSuccessfulOrders = _totalSuccessfulOrders + 1;

        IERC20(order.tokenAddress).safeTransfer(_devWallet, order.amount);
        
        emit OrderSuccessful(orderId, order.user, order.tokenAddress, order.amount);
    }

    /**
     * @dev Mark order as failed
     */
    function markOrderFailed(uint256 orderId) 
        external 
        nonReentrant
        onlyAdmin 
        orderExists(orderId) 
        orderPending(orderId) 
    {
        Order storage order = _orders[orderId];
        SupportedToken storage token = _supportedTokens[order.tokenAddress];

        order.status = OrderStatus.Failed;
        order.processedTimestamp = block.timestamp;

        token.failedOrders = token.failedOrders + 1;
        _totalFailedOrders = _totalFailedOrders + 1;

        IERC20(order.tokenAddress).safeTransfer(order.user, order.amount);
        
        emit OrderFailed(orderId, order.user, order.tokenAddress, order.amount);
    }

    /**
     * @dev Update order limit for a token
     */
    function updateOrderLimit(address tokenAddress, uint256 newLimit) 
        external 
        onlyAdmin 
        validAddress(tokenAddress) 
        tokenSupported(tokenAddress) 
    {
        if (_supportedTokens[tokenAddress].orderLimit != newLimit) {
            _supportedTokens[tokenAddress].orderLimit = newLimit;
            emit OrderLimitUpdated(tokenAddress, newLimit);
        }
    }

    /**
     * @dev Set new dev wallet address
     */
    function setDevWallet(address newDevWallet) 
        external 
        onlyOwner 
        validAddress(newDevWallet) 
    {
        if (_devWallet != newDevWallet) {
            address oldWallet = _devWallet;
            _devWallet = newDevWallet;
            emit DevWalletUpdated(oldWallet, newDevWallet);
        }
    }

    /**
     * @dev Emergency withdraw tokens
     */
    function emergencyWithdrawToken(address tokenAddress, uint256 amount) 
        external 
        onlyOwner 
        validAddress(tokenAddress) 
        validAmount(amount) 
    {
        uint256 contractBalance = IERC20(tokenAddress).balanceOf(address(this));
        require(contractBalance >= amount, "Insufficient balance");

        IERC20(tokenAddress).safeTransfer(owner(), amount);
        
        emit EmergencyWithdraw(tokenAddress, amount);
    }

    /**
     * @dev Add supported token
     */
    function addSupportedToken(
        address tokenAddress,
        string memory name,
        uint8 decimals
    ) external onlyAdmin validAddress(tokenAddress) {
        require(_supportedTokens[tokenAddress].tokenAddress == address(0), "Token exists");

        SupportedToken storage newToken = _supportedTokens[tokenAddress];
        newToken.tokenAddress = tokenAddress;
        newToken.name = name;
        newToken.decimals = decimals;
        newToken.isActive = true;
        newToken.orderLimit = type(uint256).max;
        newToken.totalVolume = 0;
        newToken.successfulOrders = 0;
        newToken.failedOrders = 0;

        _tokenList.push(tokenAddress);
        emit TokenAdded(tokenAddress, name, decimals);
    }

    /**
     * @dev Set token status
     */
    function setTokenStatus(address tokenAddress, bool status) 
        external 
        onlyAdmin 
        validAddress(tokenAddress) 
    {
        require(_supportedTokens[tokenAddress].tokenAddress != address(0), "Token not found");
        
        if (_supportedTokens[tokenAddress].isActive != status) {
            _supportedTokens[tokenAddress].isActive = status;
            emit TokenStatusUpdated(tokenAddress, status);
        }
    }

    /**
     * @dev Add user to blacklist
     */
    function addToBlacklist(address user) external onlyAdmin validAddress(user) {
        if (!_userData[user].isBlacklisted) {
            _userData[user].isBlacklisted = true;
            emit UserBlacklisted(user);
        }
    }

    /**
     * @dev Remove user from blacklist
     */
    function removeFromBlacklist(address user) external onlyAdmin validAddress(user) {
        if (_userData[user].isBlacklisted) {
            _userData[user].isBlacklisted = false;
            emit UserRemovedFromBlacklist(user);
        }
    }

    /**
     * @dev Add admin
     */
    function addAdmin(address admin) external onlyOwner validAddress(admin) {
        if (!_userData[admin].isAdmin) {
            _userData[admin].isAdmin = true;
            emit AdminAdded(admin);
        }
    }

    /**
     * @dev Remove admin
     */
    function removeAdmin(address admin) external onlyOwner validAddress(admin) {
        if (_userData[admin].isAdmin) {
            _userData[admin].isAdmin = false;
            emit AdminRemoved(admin);
        }
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // Read Functions

    function getOrder(uint256 orderId) external view orderExists(orderId) returns (Order memory) {
        return _orders[orderId];
    }

    function getUserOrders(address user) external view returns (uint256[] memory) {
        return _userData[user].orders;
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return _tokenList;
    }

    function isTokenSupported(address tokenAddress) external view returns (bool) {
        return _supportedTokens[tokenAddress].isActive;
    }

    function getOrderLimit(address tokenAddress) external view returns (uint256) {
        return _supportedTokens[tokenAddress].orderLimit;
    }

    function getDevWallet() external view returns (address) {
        return _devWallet;
    }

    function getTotalVolume() external view returns (uint256) {
        return _totalVolume;
    }

    function getTotalSuccessfulOrders() external view returns (uint256) {
        return _totalSuccessfulOrders;
    }

    function getTotalFailedOrders() external view returns (uint256) {
        return _totalFailedOrders;
    }

    function isBlacklisted(address user) external view returns (bool) {
        return _userData[user].isBlacklisted;
    }

    function checkAllowance(address user, address tokenAddress) external view returns (uint256) {
        return IERC20(tokenAddress).allowance(user, address(this));
    }

    function checkBalance(address user, address tokenAddress) external view returns (uint256) {
        return IERC20(tokenAddress).balanceOf(user);
    }

    function getTokenDetails(address tokenAddress) external view returns (SupportedToken memory) {
        return _supportedTokens[tokenAddress];
    }

    function isAdmin(address admin) external view returns (bool) {
        return _userData[admin].isAdmin;
    }

    function getOrderCounter() external view returns (uint256) {
        return _orderCounter;
    }

    function version() external pure returns (string memory) {
        return "1.0.1";
    }
}