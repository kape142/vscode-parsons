import java.util.ArrayList;
import java.util.List;

public class Stock {

    private final String ticker;
    private double price;
    private List<StockListener> listeners = new ArrayList<StockListener>();
    
    public Stock(String ticker, double price) {
        this.ticker = ticker;
        this.price = price;
    }

    public double getPrice() {
        return this.price;
    }

    public void setPrice(double newPrice) {
        double oldPrice = this.price;
        this.price = newPrice;
        if (this.price != oldPrice) {
            $parson{firePriceChanged};
        }
    }
    
    public void addStockListener(StockListener listener) {
        $parson{listenersAdd};
    }

    protected void firePriceChanged(double oldPrice) {
        for (StockListener listener : listeners) {
            listener.stockPriceChanged($parson{fireThis}, $parson{fireOldPrice}, $parson{fireThisPrice});
        }
    }
}
