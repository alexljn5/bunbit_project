import javax.swing.*;

public class test {
    public static void main(String[] args) {
        JFrame frame = new JFrame("Test Frame");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(400, 300);
        frame.setVisible(true);

        JLabel label = new JLabel("Hello, World!", SwingConstants.CENTER);
        label.setBounds(50, 50, 300, 50);

        JButton button = new JButton("Click Me");
        button.setBounds(150, 150, 100, 50);
        frame.add(button);

        button.addActionListener(e -> {
            JOptionPane.showMessageDialog(frame, "Button Clicked!");
            testMethod();
        });
    }

    public static void testMethod() {
        System.out.println("This is a test method.");
    }
}
