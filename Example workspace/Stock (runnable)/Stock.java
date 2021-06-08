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
            firePriceChanged(oldPrice);
            /*$parson{
                "text": "firePriceChanged(oldPrice)",
                "width": 52,
                "type": "dragdrop"
            }*/
        }
    }
    
    public void addStockListener(StockListener listener) {
        listeners.add(listener);
        /*$parson{
            "text": "listeners.add(listener)",
            "width": 46,
            "type": "dragdrop"
        }*/
    }

    @Override
    /*$parson{
        "text": "@Override",
        "width": 22,
        "type": "dropdown",
        "dropdown": "annotation"
    }*/
    public String toString() {
        return this.ticker+": "+this.price;
    }
    
    protected void firePriceChanged(double oldPrice) {
        for (StockListener listener : listeners) {
            listener.stockPriceChanged(this, oldPrice, this.price);
            /*$parson{
                "text": "this",
                "width": 20,
                "type": "dragdrop"
            }*/
            /*$parson{
                "text": "oldPrice",
                "width": 20,
                "type": "dragdrop"
            }*/
            /*$parson{
                "text": "this.price",
                "width": 20,
                "type": "dragdrop"
            }*/
        }
    }
}
