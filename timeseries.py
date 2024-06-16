from alpha_vantage.timeseries import TimeSeries
import matplotlib.pyplot as plt
from cachetools import TTLCache

# Use the provided Alpha Vantage API key directly
api_key = 'KZCMVSOBKLFKO5XB'

# Initialize TimeSeries with your API key
ts = TimeSeries(key=api_key, output_format='pandas')

# Cache to store stock data with a TTL (Time to Live) of 24 hours
cache = TTLCache(maxsize=100, ttl=86400)

def fetch_stock_data(symbol):
    if symbol in cache:
        print(f"Fetching cached data for {symbol}...")
        return cache[symbol]
    
    try:
        print(f"Retrieving intraday data for {symbol}...")
        data, meta_data = ts.get_intraday(symbol=symbol, interval='1min', outputsize='full')
        
        if data.empty:
            print(f"No data retrieved for {symbol}.")
            return None, None
        
        print(f"Data for {symbol} retrieved successfully.")
        cache[symbol] = data
        return data
    except ValueError as e:
        if "standard API rate limit" in str(e):
            print(f"Rate limit exceeded: {e}")
        else:
            print(f"An error occurred while retrieving data for {symbol}: {e}")
        return None

def get_stock_data(symbol):
    data = fetch_stock_data(symbol)
    if data is not None:
        dates = data.index.strftime('%Y-%m-%d %H:%M:%S').tolist()
        prices = data['4. close'].tolist()
        return dates, prices
    return [], []

def fetch_and_plot_data(symbol):
    try:
        print(f"Retrieving intraday data for {symbol}...")
        data, meta_data = ts.get_intraday(symbol=symbol, interval='1min', outputsize='full')
        
        if data.empty:
            print(f"No data retrieved for {symbol}.")
            return None, None
        
        print(f"Data for {symbol} retrieved successfully.")
        return data, meta_data
    except Exception as e:
        if "standard API rate limit" in str(e):
            print(f"Rate limit exceeded: {e}")
        else:
            print(f"An error occurred while retrieving data for {symbol}: {e}")
        return None, None

def plot_data(stock_data):
    try:
        plt.figure(figsize=(14, 8))
        for symbol, data in stock_data.items():
            if data is not None:
                plt.plot(data['4. close'], label=symbol)
        
        plt.title('Intraday TimeSeries for Top Performing Stocks')
        plt.xlabel('Time')
        plt.ylabel('Closing Price (USD)')
        plt.legend()
        plt.grid()
        plt.show()  # Display the plot interactively
        plt.savefig('stock_prices.png')  # Save plot as an image file
        print("Plot displayed and saved as 'stock_prices.png'.")
    except Exception as e:
        print(f"An error occurred while plotting data: {e}")

def main():
    stock_data = {}
    top_stocks = ['MSFT', 'AAPL', 'GOOGL', 'AMZN', 'META']
    for symbol in top_stocks:
        data, meta_data = fetch_and_plot_data(symbol)
        stock_data[symbol] = data
    
    if any(data is not None for data in stock_data.values()):
        plot_data(stock_data)
    else:
        print("No data available to plot.")

if __name__ == "__main__":
    main()

